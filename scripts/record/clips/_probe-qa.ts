/**
 * Probe (excluded from run.ts): quick-action chips vs selection on the busy
 * seeded canvas. Read-only — no chip is clicked.
 */
import { chromium } from "playwright";
import { STATE_PATH } from "../lib/auth.ts";
import { BASE_URL as BASE } from "../lib/env.ts";

const SCRATCH = process.env.SCRATCH ?? "/tmp";
const PROJECT = "6a4adad69a876dea0d2d112e"; // masai maara (Remix)

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
await page.goto(`${BASE}/editor/${PROJECT}/canvas`, { waitUntil: "domcontentloaded" });
await page.waitForLoadState("networkidle").catch(() => {});
await page.waitForTimeout(5000);
await page.getByRole("button", { name: "Skip for now" }).click({ force: true, timeout: 3000 }).catch(() => {});
await page.keyboard.press("Shift+Digit1");
await page.waitForTimeout(1200);

const chips = () =>
  page
    .locator("button")
    .filter({ hasText: /^(Audit canvas|Make video|Organize flow|Animate image|Image variants|Add storyboard|Improve video|Make variants|Explain setup|Compose video|Storyboard these|Organize selection|Continue storyboard|Find gaps|Layout canvas|Brand concept|Storyboard ad|Product video|Generate scenes|Tighten story|Make video plan)$/ })
    .allInnerTexts();

// 1. Expand the dock with nothing selected.
await page.getByRole("button", { name: "Open Flowy AI" }).click({ force: true });
await page.waitForTimeout(2500);
console.log("no selection chips:", await chips());
await page.screenshot({ path: `${SCRATCH}/qa-nosel.png` });

// 2. Select an image node.
const imgNode = page
  .locator(".react-flow__node-staticImageBlock")
  .filter({ has: page.locator("img[alt='Generated result']") })
  .first();
const box = await imgNode.boundingBox();
if (!box) throw new Error("no image node found");
await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
await page.waitForTimeout(2500);
console.log("image selected chips:", await chips());
console.log("dock composer visible:", await page.getByRole("textbox", { name: "Describe what you want to generate…" }).isVisible().catch(() => false));
console.log("dock pill visible:", await page.getByRole("button", { name: "Open Flowy AI" }).isVisible().catch(() => false));
await page.screenshot({ path: `${SCRATCH}/qa-imgsel.png` });

// 3. Click the "Image variants" chip exactly like the h.click helper does:
// raw mouse down/up at the chip's center.
const chip = page.getByRole("button", { name: "Image variants" });
const cbox = await chip.boundingBox();
console.log("chip box before hover:", JSON.stringify(cbox));
if (cbox) {
  await page.mouse.move(cbox.x + cbox.width / 2, cbox.y + cbox.height / 2, { steps: 16 });
  await page.waitForTimeout(900); // let the hover expansion settle
  const fresh = await chip.boundingBox();
  console.log("chip box after hover:", JSON.stringify(fresh));
  if (fresh) {
    await page.mouse.move(fresh.x + fresh.width / 2, fresh.y + fresh.height / 2, { steps: 6 });
    await page.waitForTimeout(200);
    await page.mouse.down();
    await page.waitForTimeout(90);
    await page.mouse.up();
  }
}
await page.waitForTimeout(5000);
await page.screenshot({ path: `${SCRATCH}/qa-chipclick.png` });
const log = page.locator("[role='log']");
console.log("chat log after click:", (await log.innerText().catch(() => "none")).slice(0, 500));
console.log("chip still visible:", await chip.isVisible().catch(() => false));
await browser.close();
