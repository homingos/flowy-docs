/**
 * Probe (excluded from run.ts): extract stripe.com as a brand kit, then check
 * whether it shows up in the canvas Brand Kit node's kit list.
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
const page = await context.newPage();
await page.goto(`${BASE}/dashboard/brandkit`, { waitUntil: "domcontentloaded" });
await page.waitForLoadState("networkidle").catch(() => {});
await page.waitForTimeout(3000);
const urlBox = page.getByRole("textbox", { name: "example.com" });
await urlBox.click();
await page.keyboard.type("stripe.com", { delay: 30 });
await page.getByRole("button", { name: "Extract" }).click();
// Wait for the gallery card (dropdown may also contain the text — wait for it
// to close first by pressing Escape).
await page.keyboard.press("Escape").catch(() => {});
const t0 = Date.now();
await page.getByText("stripe.com", { exact: true }).first().waitFor({ state: "visible", timeout: 240_000 });
console.log(`extraction visible after ${Math.round((Date.now() - t0) / 1000)}s`);
await page.waitForTimeout(2000);
await page.screenshot({ path: `${SCRATCH}/stripe-card.png` });

await page.goto(`${BASE}/editor/6a4b79b9514413fa84caca9f/canvas`, { waitUntil: "domcontentloaded" });
await page.waitForLoadState("networkidle").catch(() => {});
await page.waitForTimeout(4000);
await page.getByRole("button", { name: "Skip for now" }).click({ force: true, timeout: 3000 }).catch(() => {});
await page.getByRole("button", { name: "Add a node" }).click({ force: true });
await page.waitForTimeout(700);
await page.locator('[aria-label="Node selection"]').getByRole("button", { name: /^Brand Kit/ }).click({ force: true });
const search = page.getByRole("textbox", { name: /Search kits/ }).first();
await search.waitFor({ state: "visible", timeout: 10_000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${SCRATCH}/kitsearch-stripe.png` });
const listed = await page.getByRole("button", { name: /Stripe/i }).first().isVisible().catch(() => false);
console.log(`Stripe in panel: ${listed}`);
// Cleanup: remove the probe's node-in-progress by pressing Escape.
await page.keyboard.press("Escape").catch(() => {});
await browser.close();
