/**
 * Probe (excluded from run.ts): what does the Mug Model node show BEFORE
 * opening the 3D viewer? Screenshot the zoomed node.
 */
import { chromium } from "playwright";
import { STATE_PATH } from "../lib/auth.ts";
import { BASE_URL as BASE } from "../lib/env.ts";

const SCRATCH = process.env.SCRATCH ?? "/tmp";
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  storageState: STATE_PATH,
  viewport: { width: 1280, height: 800 },
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
const NODE_ID = "3d_435cbd280ec0408c98305b2dca6ab61a";
const node = page.locator(`.react-flow__node[data-id="${NODE_ID}"]`);
let b = await node.boundingBox();
if (!b) {
  await page.keyboard.press("Shift+Digit1");
  await page.waitForTimeout(800);
  b = await node.boundingBox();
}
if (!b) throw new Error("no node");
await page.mouse.click(b.x + b.width * 0.4, b.y + 6);
await page.waitForTimeout(500);
await page.keyboard.press("Shift+Digit2");
await page.waitForTimeout(1500);
await page.screenshot({ path: `${SCRATCH}/node3d-preview.png` });
console.log("node text:", ((await node.textContent()) ?? "").slice(0, 200));
const imgs = await node.locator("img").count();
const canvases = await node.locator("canvas").count();
const videos = await node.locator("video").count();
console.log(`imgs=${imgs} canvases=${canvases} videos=${videos}`);
if (imgs) {
  for (let i = 0; i < imgs; i++) {
    console.log("img src:", ((await node.locator("img").nth(i).getAttribute("src")) ?? "").slice(0, 120));
  }
}
await browser.close();
