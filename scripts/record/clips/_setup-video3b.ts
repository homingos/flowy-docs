/**
 * Setup (excluded from run.ts): follow-up — wire EXISTING landscape stills
 * into Dawn Drift's first/last frame inputs (the first pass created empty
 * placeholder image nodes).
 */
import { chromium } from "playwright";
import { STATE_PATH } from "../lib/auth.ts";
import { BASE_URL as BASE } from "../lib/env.ts";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  storageState: STATE_PATH,
  viewport: { width: 1280, height: 800 },
  colorScheme: "dark",
});
const page = await context.newPage();
await page.goto(`${BASE}/editor/6a4adad69a876dea0d2d112e/canvas`, { waitUntil: "domcontentloaded" });
await page.waitForLoadState("networkidle").catch(() => {});
await page.waitForTimeout(5000);
await page.getByRole("button", { name: "Skip for now" }).click({ force: true, timeout: 3000 }).catch(() => {});

await page.getByRole("button", { name: "Open Flowy chat" }).click({ force: true });
const composer = page.getByRole("textbox", { name: "Ask Flowy to build, wire, or generate…" });
await composer.waitFor({ state: "visible", timeout: 15_000 });
await page.getByRole("button", { name: "New chat" }).click({ force: true, timeout: 4000 }).catch(() => {});
await page.waitForTimeout(800);
await composer.click({ force: true });
await page.keyboard.type(
  "The video node 'Dawn Drift' currently has two EMPTY placeholder image nodes wired as its first/last frames. Fix this: disconnect and remove nothing, but rewire — connect two EXISTING wide savanna landscape images that already have generated content in this project as the first frame and last frame inputs (image role: frames) of 'Dawn Drift', replacing the empty placeholders' connections. Do NOT generate anything.",
  { delay: 4 },
);
await page.keyboard.press("Enter");
await page.waitForTimeout(3000);
await composer.waitFor({ state: "visible", timeout: 300_000 });
await page.waitForTimeout(1500);

// Verify: does Dawn Drift now have wired image parents with content?
const info = await page.evaluate(() => {
  const el = document.querySelector('.react-flow__node[data-id="video_09278dcb91c042d09b98c9aad7183119"]');
  return (el?.textContent ?? "missing").slice(0, 120);
});
console.log("Dawn Drift:", info);
await browser.close();
