/**
 * Probe (excluded from run.ts): Sunrise Sweep's controls while label is stuck
 * on "Generating…" — is there Cancel/Stop/Regenerate? Screenshot node+panel.
 */
import { chromium } from "playwright";
import { STATE_PATH } from "../lib/auth.ts";
import { BASE_URL as BASE } from "../lib/env.ts";

const SCRATCH = process.env.SCRATCH ?? "/tmp";
const NODE_ID = "video_d645604076a84d10aa328be3e7061b48";
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
  await page.waitForTimeout(800);
  b = await node.boundingBox();
}
if (!b) throw new Error("no node");
await page.mouse.click(b.x + b.width * 0.4, b.y + 6);
await page.waitForTimeout(500);
await page.keyboard.press("Shift+Digit2");
await page.waitForTimeout(1200);
b = await node.boundingBox();
if (!b) throw new Error("node lost");
// Hover the node center to reveal action buttons.
await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
await page.waitForTimeout(1200);
const btns = await node.evaluate((el) =>
  Array.from(el.querySelectorAll("button")).map(
    (x) => x.getAttribute("aria-label") || x.getAttribute("title") || (x.textContent ?? "").trim().slice(0, 30),
  ),
);
console.log("node buttons on hover:", JSON.stringify(btns));
console.log("node text:", ((await node.textContent()) ?? "").slice(0, 150));
await page.screenshot({ path: `${SCRATCH}/ss-hover.png` });
await browser.close();
