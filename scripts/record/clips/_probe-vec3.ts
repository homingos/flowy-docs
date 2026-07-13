/**
 * Probe (excluded from run.ts): HEADED context-menu behavior around Tools →
 * Vectorize on a generated image node, mirroring the clip's raw-mouse moves.
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
await page.keyboard.press("Shift+Digit1");
await page.waitForTimeout(1000);

const img = page
  .locator(".react-flow__node-staticImageBlock")
  .filter({ has: page.locator("img[alt='Generated result']") })
  .first();
const b = await img.boundingBox();
if (!b) throw new Error("no image node");
// Raw-mouse right click like the clip does.
await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 20 });
await page.waitForTimeout(400);
await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2, { button: "right" });
await page.waitForTimeout(1000);
const tools = page.getByRole("button", { name: "Tools" }).first();
console.log("tools visible:", await tools.isVisible().catch(() => false));
const tb = await tools.boundingBox();
if (tb) {
  // Move like h.moveTo (steps) then rest.
  await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2, { steps: 32 });
  await page.waitForTimeout(1200);
  const vz = page.getByRole("button", { name: /Vectorize/ }).first();
  console.log("after hover: vectorize attached:", (await vz.count()) > 0);
  // screenshot skipped in headed mode
  if ((await vz.count()) === 0) {
    // Try clicking Tools.
    await page.mouse.down();
    await page.waitForTimeout(90);
    await page.mouse.up();
    await page.waitForTimeout(1000);
    console.log("after click: vectorize attached:", (await vz.count()) > 0); console.log("upscale attached:", await page.getByRole("button", { name: "Upscale" }).count(), "tools count:", await page.getByRole("button", { name: "Tools" }).count());
    // screenshot skipped
  }
  if ((await vz.count()) > 0) {
    const zb = await vz.boundingBox();
    console.log("vectorize box:", JSON.stringify(zb));
  }
}
await browser.close();
