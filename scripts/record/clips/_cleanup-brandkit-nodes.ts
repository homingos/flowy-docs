/**
 * Cleanup (excluded from run.ts): remove MY stray Brand Kit nodes left on the
 * Wandering Sparrow canvas by failed brand-kit takes. Only touches nodes whose
 * data-testid starts with rf__node-brandkit — never seed content.
 */
import { chromium } from "playwright";
import { STATE_PATH } from "../lib/auth.ts";
import { BASE_URL as BASE } from "../lib/env.ts";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  storageState: STATE_PATH,
  viewport: { width: 1280, height: 800 },
  colorScheme: "dark",
});
const page = await context.newPage();
await page.goto(`${BASE}/editor/6a4b79b9514413fa84caca9f/canvas`, { waitUntil: "domcontentloaded" });
await page.waitForLoadState("networkidle").catch(() => {});
await page.waitForTimeout(4000);
await page.getByRole("button", { name: "Skip for now" }).click({ force: true, timeout: 3000 }).catch(() => {});

for (let round = 0; round < 8; round++) {
  const nodes = page.locator('[data-testid^="rf__node-brandkit"]');
  const n = await nodes.count();
  console.log(`round ${round}: ${n} brandkit node(s)`);
  if (n === 0) break;
  const node = nodes.first();
  await node.scrollIntoViewIfNeeded().catch(() => {});
  const box = await node.boundingBox();
  if (!box) {
    await page.keyboard.press("Shift+Digit1");
    await page.waitForTimeout(800);
    continue;
  }
  await page.mouse.click(box.x + box.width / 2, box.y + 4);
  await page.waitForTimeout(600);
  await page.keyboard.press("Backspace");
  await page.waitForTimeout(1200);
  const after = await page.locator('[data-testid^="rf__node-brandkit"]').count();
  if (after >= n) {
    console.log("Backspace did not delete; trying Delete key");
    await page.keyboard.press("Delete");
    await page.waitForTimeout(1200);
    const after2 = await page.locator('[data-testid^="rf__node-brandkit"]').count();
    if (after2 >= n) {
      console.log("Delete key also failed — aborting to avoid damage");
      break;
    }
  }
}
console.log(`final count: ${await page.locator('[data-testid^="rf__node-brandkit"]').count()}`);
await browser.close();
