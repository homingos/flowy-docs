/**
 * Setup (excluded from run.ts): create a blank project and print its editor id.
 *
 *   FE_ROOT=… ../node_modules/.bin/tsx clips/_make-blank.ts
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
await page.goto(`${BASE}/dashboard/projects`, { waitUntil: "domcontentloaded" });
await page.waitForLoadState("networkidle").catch(() => {});
await page.waitForTimeout(2000);
const btn = page.getByRole("button", { name: "Create a new project" });
await btn.waitFor({ state: "visible", timeout: 15_000 });
const box = await btn.boundingBox();
if (!box) throw new Error("no create button box");
await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
// A Canvas/Studio chooser dialog appears — confirm Canvas.
const start = page.getByRole("button", { name: /Start creating/ });
await start.waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});
const sbox = await start.boundingBox().catch(() => null);
if (sbox) await page.mouse.click(sbox.x + sbox.width / 2, sbox.y + sbox.height / 2);
await page
  .waitForURL(/\/editor\//, { timeout: 30_000 })
  .catch(async () => {
    await page.screenshot({ path: `${process.env.SCRATCH ?? "/tmp"}/make-blank.png` });
    console.log((await page.locator("body").ariaSnapshot()).split("\n").slice(0, 40).join("\n"));
    throw new Error(`still at ${page.url()}`);
  });
await page.waitForTimeout(3000);
console.log("project url:", page.url());
await browser.close();
