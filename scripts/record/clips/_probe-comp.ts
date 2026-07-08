/**
 * Probe (excluded from run.ts): composition node aria on masai maara.
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
await page.goto(`${BASE}/editor/6a4adad69a876dea0d2d112e/canvas`, { waitUntil: "domcontentloaded" });
await page.waitForLoadState("networkidle").catch(() => {});
await page.waitForTimeout(6000);
await page.getByRole("button", { name: "Skip for now" }).click({ force: true, timeout: 3000 }).catch(() => {});

const comp = page.locator(".react-flow__node-compositionBlock").first();
const box = await comp.boundingBox();
console.log("comp box:", JSON.stringify(box));
// Select it and zoom to selection.
if (box) await page.mouse.click(box.x + Math.min(box.width / 2, 200), box.y + 10);
await page.waitForTimeout(500);
await page.keyboard.press("Shift+Digit2");
await page.waitForTimeout(1500);
await page.screenshot({ path: `${SCRATCH}/comp-node.png` });
console.log(await comp.ariaSnapshot());
await browser.close();
