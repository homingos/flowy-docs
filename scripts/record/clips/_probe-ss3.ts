/**
 * Probe (excluded from run.ts): contents of Sunrise Sweep's Node options menu
 * while the label is stuck on "Generating…".
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
const page = await context.newPage();
await page.goto(`${BASE}/editor/6a4adad69a876dea0d2d112e/canvas`, { waitUntil: "domcontentloaded" });
await page.waitForLoadState("networkidle").catch(() => {});
await page.waitForTimeout(5000);
await page.getByRole("button", { name: "Skip for now" }).click({ force: true, timeout: 3000 }).catch(() => {});
const node = page.locator(`.react-flow__node[data-id="${NODE_ID}"]`);
let b = await node.boundingBox();
if (!b) throw new Error("no node in view; needs zoom-to-fit first");
// Cursor-centered zoom until the node is comfortably large.
for (let i = 0; i < 25 && b && b.width < 330; i++) {
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.keyboard.down("Meta");
  await page.mouse.wheel(0, -200);
  await page.keyboard.up("Meta");
  await page.waitForTimeout(200);
  b = await node.boundingBox();
}
if (!b) throw new Error("node lost during zoom");
// Select the node, then open its options menu.
await page.mouse.click(b.x + b.width * 0.4, b.y + 2);
await page.waitForTimeout(600);
const opts = node.getByRole("button", { name: "Node options" }).first();
await opts.click({ force: true });
await page.waitForTimeout(900);
const items = await page.evaluate(() => {
  const out: string[] = [];
  for (const el of Array.from(document.querySelectorAll("[role='menu'] [role='menuitem'], [role='menuitem'], [data-radix-popper-content-wrapper] button"))) {
    const t = (el.textContent ?? "").trim();
    if (t && t.length < 40) out.push(t);
  }
  return out;
});
console.log("menu items:", JSON.stringify(items));
await page.screenshot({ path: `${SCRATCH}/ss-menu.png` });
await browser.close();
