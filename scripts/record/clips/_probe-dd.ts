/**
 * Probe (excluded from run.ts): screenshot Dawn Drift zoomed, list nearby
 * frame nodes' content state.
 */
import { chromium } from "playwright";
import { STATE_PATH } from "../lib/auth.ts";
import { BASE_URL as BASE } from "../lib/env.ts";

const SCRATCH = process.env.SCRATCH ?? "/tmp";
const NODE_ID = "video_09278dcb91c042d09b98c9aad7183119";
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
await page.goto(`${BASE}/editor/6a4adad69a876dea0d2d112e/canvas`, { waitUntil: "domcontentloaded" });
await page.waitForLoadState("networkidle").catch(() => {});
await page.waitForTimeout(5000);
await page.getByRole("button", { name: "Skip for now" }).click({ force: true, timeout: 3000 }).catch(() => {});
const node = page.locator(`.react-flow__node[data-id="${NODE_ID}"]`);
let b = await node.boundingBox();
if (!b) {
  await page.keyboard.press("Shift+Digit1");
  await page.waitForTimeout(900);
  b = await node.boundingBox();
}
if (!b) throw new Error("no node");
// Zoom out slightly is fine; center on node and zoom until reasonably sized.
for (let i = 0; i < 30; i++) {
  b = await node.boundingBox();
  if (!b) break;
  if (b.width >= 280 && b.width <= 620) break;
  const dir = b.width < 280 ? -160 : 160;
  await page.mouse.move(Math.max(10, Math.min(1270, b.x + b.width / 2)), Math.max(10, Math.min(790, b.y + b.height / 2)));
  await page.keyboard.down("Meta");
  await page.mouse.wheel(0, dir);
  await page.keyboard.up("Meta");
  await page.waitForTimeout(200);
}
await page.waitForTimeout(800);
await page.screenshot({ path: `${SCRATCH}/dd-zoom.png` });
// Frame nodes' state
for (const [label, id] of [
  ["First Frame", "image_a86ed7f78a4d47b485942c7280e6c8de"],
  ["Last Frame", "image_1006d24cd46d4635bdad8a147c042b67"],
] as const) {
  const n = page.locator(`.react-flow__node[data-id="${id}"]`);
  const exists = (await n.count()) > 0;
  const text = exists ? ((await n.textContent()) ?? "").slice(0, 60) : "REMOVED";
  const img = exists ? await n.locator("img").count() : 0;
  console.log(`${label}: exists=${exists} imgs=${img} text="${text}"`);
}
await browser.close();
