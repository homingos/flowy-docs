/**
 * Probe (excluded from run.ts): vector entry points on Midnight Meadow —
 * (a) double-click AddNodePopover with search, (b) image right-click Vectorize.
 * Read-only: menus are opened and closed, nothing created.
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
const page = await context.newPage();
await page.goto(`${BASE}/editor/6a4b7988514413fa84caca94/canvas`, { waitUntil: "domcontentloaded" });
await page.waitForLoadState("networkidle").catch(() => {});
await page.waitForTimeout(5000);
await page.getByRole("button", { name: "Skip for now" }).click({ force: true, timeout: 3000 }).catch(() => {});
await page.keyboard.press("Shift+Digit1");
await page.waitForTimeout(1000);

// (a) double-click empty canvas bottom-left.
await page.mouse.dblclick(420, 820);
await page.waitForTimeout(1200);
await page.screenshot({ path: `${SCRATCH}/vec-popover.png` });
const snap1 = await page.locator("body").ariaSnapshot();
console.log("--- popover lines with vector/search ---");
console.log(snap1.split("\n").filter((l) => /[Vv]ector|Search nodes|option|button "V/.test(l)).slice(0, 20).join("\n"));
await page.keyboard.press("Escape");
await page.waitForTimeout(600);

// (b) right-click a generated image node.
const img = page
  .locator(".react-flow__node-staticImageBlock")
  .filter({ has: page.locator("img[alt='Generated result']") })
  .first();
const b = await img.boundingBox();
console.log("img box:", JSON.stringify(b));
if (b) {
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2, { button: "right" });
  await page.waitForTimeout(1000);
  const tools = page.getByRole("button", { name: "Tools" }).first();
  const tb = await tools.boundingBox();
  console.log("tools box:", JSON.stringify(tb));
  if (tb) {
    await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2, { steps: 8 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${SCRATCH}/vec-tools-hover.png` });
    const s1 = await page.locator("body").ariaSnapshot();
    console.log("hover submenu:", s1.split("\n").filter((l) => /Vectorize|Upscale|Remove|Inpaint|Outpaint/i.test(l)).join("\n") || "none");
    await page.mouse.click(tb.x + tb.width / 2, tb.y + tb.height / 2);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${SCRATCH}/vec-tools-click.png` });
    const s2 = await page.locator("body").ariaSnapshot();
    console.log("click submenu:", s2.split("\n").filter((l) => /Vectorize|Upscale|Remove|Inpaint|Outpaint/i.test(l)).join("\n") || "none");
  }
}
await browser.close();
