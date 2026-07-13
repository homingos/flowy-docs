/**
 * Probe (excluded from run.ts): video node classes, settings panel, and the
 * motion-path editor on masai maara. Read-only until the editor opens; any
 * drawing is discarded by not saving.
 */
import { chromium } from "playwright";
import { STATE_PATH } from "../lib/auth.ts";
import { BASE_URL as BASE } from "../lib/env.ts";

const SCRATCH = process.env.SCRATCH ?? "/tmp";
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  storageState: STATE_PATH,
  viewport: { width: 1920, height: 1080 },
  colorScheme: "dark",
});
await context.addInitScript(() => {
  const style = document.createElement("style");
  style.textContent = '[data-testid="react-grab-overlay"] { display: none !important; }';
  document.addEventListener("DOMContentLoaded", () => document.head.appendChild(style));
});
const PROJECT = process.argv[2] ?? "6a4adad69a876dea0d2d112e";
const page = await context.newPage();
await page.goto(`${BASE}/editor/${PROJECT}/canvas`, { waitUntil: "domcontentloaded" });
await page.waitForLoadState("networkidle").catch(() => {});
await page.waitForTimeout(6000);
await page.getByRole("button", { name: "Skip for now" }).click({ force: true, timeout: 3000 }).catch(() => {});
await page.keyboard.press("Shift+Digit1");
await page.waitForTimeout(1000);

// All node classes.
const classes = await page.evaluate(() => {
  const seen: Record<string, number> = {};
  document.querySelectorAll(".react-flow__node").forEach((el) => {
    const c = Array.from(el.classList).find((x) => x.startsWith("react-flow__node-")) ?? "?";
    seen[c] = (seen[c] ?? 0) + 1;
  });
  return seen;
});
console.log("classes:", JSON.stringify(classes));

// Zoom into the first video-ish node and select it.
const video = page.locator("[class*='react-flow__node-video']").first();
if ((await video.count()) === 0) {
  console.log("no video node class found");
  await browser.close();
  process.exit(0);
}
let b = await video.boundingBox();
if (!b) throw new Error("no box");
await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
await page.keyboard.down("Meta");
for (let i = 0; i < 14; i++) {
  b = await video.boundingBox();
  if (!b || b.width > 330) break;
  await page.mouse.wheel(0, -120);
  await page.waitForTimeout(150);
}
await page.keyboard.up("Meta");
b = await video.boundingBox();
if (!b) throw new Error("no box after zoom");
await page.mouse.click(b.x + b.width * 0.4, b.y + 8);
await page.waitForTimeout(1500);
await page.screenshot({ path: `${SCRATCH}/mp-selected.png` });

// Dump the settings panel (right side).
// Scroll the settings panel down in case Motion path sits below the fold.
await page.mouse.move(1770, 500);
await page.mouse.wheel(0, 500);
await page.waitForTimeout(800);
await page.screenshot({ path: `${SCRATCH}/mp-panel.png` });
const snap = await page.locator("body").ariaSnapshot();
const lines = snap.split("\n");
console.log(lines.filter((l) => /motion|Draw|path/i.test(l)).join("\n") || "no motion-path lines");
const start = lines.findIndex((l) => /Video Node|Hero Video/.test(l));
console.log(lines.slice(Math.max(0, start), start + 50).join("\n"));
await browser.close();
