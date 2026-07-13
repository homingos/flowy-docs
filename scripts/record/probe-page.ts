/**
 * DOM probe: open a URL with the saved session, screenshot it, and dump the
 * accessibility-ish structure (roles + names) for writing clip selectors.
 *
 *   ./node_modules/.bin/tsx probe-page.ts /dashboard [outname]
 */
import { chromium } from "playwright";
import { STATE_PATH } from "./lib/auth.ts";
import { BASE_URL } from "./lib/env.ts";

const SCRATCH = process.env.SCRATCH ?? "/tmp";
const url = process.argv[2] ?? "/dashboard";
const out = process.argv[3] ?? "probe";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  storageState: STATE_PATH,
  viewport: { width: 1280, height: 800 },
  colorScheme: "dark",
});
const page = await context.newPage();
await page.goto(`${BASE_URL}${url}`, { waitUntil: "domcontentloaded" });
await page.waitForLoadState("networkidle").catch(() => {});
await page.waitForTimeout(2500);

console.log("url:", page.url());
await page.screenshot({ path: `${SCRATCH}/${out}.png` });

const snapshot = await page.locator("body").ariaSnapshot();
console.log(snapshot.slice(0, 6000));
await browser.close();
