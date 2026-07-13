/**
 * Setup (excluded from run.ts): restore masai maara's seeded nodes that were
 * left in "Generation failed — insufficient credits" state by the outage:
 * click every "Try again" so they regenerate with their original prompts.
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
await page.goto(`${BASE}/editor/6a4adad69a876dea0d2d112e/canvas`, { waitUntil: "domcontentloaded" });
await page.waitForLoadState("networkidle").catch(() => {});
await page.waitForTimeout(6000);
await page.getByRole("button", { name: "Skip for now" }).click({ force: true, timeout: 3000 }).catch(() => {});

const tryAgain = page.getByRole("button", { name: /Try again/i });
const n = await tryAgain.count();
console.log("failed nodes found:", n);
for (let i = 0; i < n; i++) {
  // Buttons re-render as they flip to generating — always take the first.
  const btn = page.getByRole("button", { name: /Try again/i }).first();
  if (!(await btn.isVisible().catch(() => false))) break;
  await btn.click({ force: true });
  console.log("retried", i + 1);
  await page.waitForTimeout(2500);
}
await page.waitForTimeout(3000);
console.log("remaining try-again buttons:", await tryAgain.count());
await browser.close();
