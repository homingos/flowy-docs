/**
 * Probe (excluded from run.ts): who has access to masai maara — read-only
 * peek at the Share dialog.
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
await page.goto(`${BASE}/editor/6a4adad69a876dea0d2d112e/canvas`, { waitUntil: "domcontentloaded" });
await page.waitForLoadState("networkidle").catch(() => {});
await page.waitForTimeout(5000);
await page.getByRole("button", { name: "Skip for now" }).click({ force: true, timeout: 3000 }).catch(() => {});
await page.getByRole("button", { name: "Share project" }).click({ force: true });
await page.waitForTimeout(2000);
await page.screenshot({ path: `${SCRATCH}/share-dialog.png` });
const snap = await page.locator("body").ariaSnapshot();
const lines = snap.split("\n");
const i0 = lines.findIndex((l) => /Share|share/i.test(l));
console.log(lines.filter((l) => /flamapp|Editor|Viewer|Owner|Invite|access|member/i.test(l)).join("\n"));
await browser.close();
