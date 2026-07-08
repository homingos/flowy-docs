/**
 * Probe (excluded from run.ts): what happens when you click an empty image
 * node's "Select to upload or Generate" face? Screenshots + control dump.
 */
import { chromium } from "playwright";
import { STATE_PATH } from "../lib/auth.ts";
import { BASE_URL as BASE } from "../lib/env.ts";

const SCRATCH = process.env.SCRATCH ?? "/tmp";
const ID = "image_a86ed7f78a4d47b485942c7280e6c8de";
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
const node = page.locator(`.react-flow__node[data-id="${ID}"]`);
let b = await node.boundingBox();
if (!b) {
  await page.keyboard.press("Shift+Digit1");
  await page.waitForTimeout(900);
  b = await node.boundingBox();
}
if (!b) throw new Error("no node");
for (let i = 0; i < 30; i++) {
  b = await node.boundingBox();
  if (!b) break;
  if (b.width >= 300 && b.width <= 640) break;
  const dir = b.width < 300 ? -140 : 140;
  await page.mouse.move(Math.max(10, Math.min(1270, b.x + b.width / 2)), Math.max(10, Math.min(790, b.y + b.height / 2)));
  await page.keyboard.down("Meta");
  await page.mouse.wheel(0, dir);
  await page.keyboard.up("Meta");
  await page.waitForTimeout(200);
}
b = await node.boundingBox();
if (!b) throw new Error("lost");
// Select first.
await page.mouse.click(b.x + b.width * 0.4, b.y + 4);
await page.waitForTimeout(700);
await page.screenshot({ path: `${SCRATCH}/empty-selected.png` });
// Click the node face (the "Select to upload or Generate" area).
await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
await page.waitForTimeout(1200);
await page.screenshot({ path: `${SCRATCH}/empty-clicked.png` });
// Dump focusable/editable elements within the node.
const info = await node.evaluate((el) => {
  const bits: string[] = [];
  for (const x of Array.from(el.querySelectorAll("textarea, input, [contenteditable], button"))) {
    bits.push(
      `${x.tagName}:${(x.getAttribute("placeholder") || x.getAttribute("aria-label") || (x.textContent || "")).trim().slice(0, 40)}`,
    );
  }
  return bits;
});
console.log("node controls:", JSON.stringify(info));
await browser.close();
