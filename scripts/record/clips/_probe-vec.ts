/**
 * Probe (excluded from run.ts): vector availability — add-node search and the
 * image node's Tools submenu on the sandbox canvas.
 *
 *   SCRATCH=<dir> ../node_modules/.bin/tsx clips/_probe-vec.ts
 */
import { chromium } from "playwright";
import { STATE_PATH } from "../lib/auth.ts";
import { BASE_URL as BASE } from "../lib/env.ts";

const SCRATCH = process.env.SCRATCH ?? "/tmp";
const PROJECT = "6a4ada4b9a876dea0d2d1126";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  storageState: STATE_PATH,
  viewport: { width: 1280, height: 800 },
  colorScheme: "dark",
});
const page = await context.newPage();

async function snap(name: string, lines = 100) {
  await page.screenshot({ path: `${SCRATCH}/${name}.png` });
  const s = await page.locator("body").ariaSnapshot();
  console.log(`\n===== ${name} =====`);
  console.log(s.split("\n").slice(0, lines).join("\n"));
}

await page.goto(`${BASE}/editor/${PROJECT}/canvas`, { waitUntil: "domcontentloaded" });
await page.waitForLoadState("networkidle").catch(() => {});
await page.waitForTimeout(3000);
await page.getByRole("button", { name: "Not now" }).click({ timeout: 2000 }).catch(() => {});

// 1. add-node search for "vector"
await page.getByRole("button", { name: "Add a node" }).click();
await page.waitForTimeout(600);
await page.locator('input[placeholder="Search nodes…"]').fill("vector");
await page.waitForTimeout(600);
await snap("p-vec-search", 60);
await page.getByRole("button", { name: "Close menu" }).click();
await page.waitForTimeout(600);

// 2. right-click a seeded image node → Tools submenu
await page.keyboard.press("Shift+Digit1");
await page.waitForTimeout(1200);
const img = page
  .locator(".react-flow__node")
  .filter({ has: page.locator("img[alt='Generated result']") })
  .first();
const box = await img.boundingBox();
if (box) {
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: "right" });
  await page.waitForTimeout(900);
  await snap("p-vec-ctx", 120);
  const tools = page.getByRole("button", { name: "Tools" }).first();
  const tb = await tools.boundingBox();
  if (tb) {
    await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2, { steps: 8 });
    await page.waitForTimeout(900);
    await snap("p-vec-tools", 140);
  }
}

await browser.close();
