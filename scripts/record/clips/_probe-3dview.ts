/**
 * Probe (excluded from run.ts): does the 3D viewer actually render? Headed,
 * plain screenshots (no screencast).
 */
import { chromium } from "playwright";
import { STATE_PATH } from "../lib/auth.ts";
import { BASE_URL as BASE } from "../lib/env.ts";

const SCRATCH = process.env.SCRATCH ?? "/tmp";
const browser = await chromium.launch({ headless: process.env.HEADED ? false : true });
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
await page.waitForTimeout(1000);
b = await node.boundingBox();
if (!b) throw new Error("node lost");
const view = node.getByText("View in 3D").first();
if (await view.isVisible().catch(() => false)) {
  await view.click({ force: true });
}
await page
  .waitForFunction(
    (nid) => {
      const el = document.querySelector(`.react-flow__node[data-id="${nid}"]`);
      return el && !(el.textContent ?? "").includes("Loading 3D model");
    },
    NODE_ID,
    { timeout: 180_000 },
  )
  .catch(() => console.log("still loading after 3m"));
await page.waitForTimeout(4000);
await page.screenshot({ path: `${SCRATCH}/viewer.png` }).catch(() => console.log("screenshot failed"));
// Inspect the canvas pixels directly.
const stats = await node
  .locator("canvas")
  .first()
  .evaluate((c: HTMLCanvasElement) => {
    try {
      const gl = c.getContext("webgl2") ?? c.getContext("webgl");
      return { w: c.width, h: c.height, hasGl: Boolean(gl) };
    } catch {
      return { w: c.width, h: c.height, hasGl: "err" };
    }
  })
  .catch(() => null);
console.log("canvas stats:", JSON.stringify(stats));
console.log("node text:", ((await node.textContent()) ?? "").slice(0, 80));
await browser.close();
