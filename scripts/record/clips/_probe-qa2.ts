/**
 * Probe (excluded from run.ts): inspect masai maara's chat thread + node count
 * after the failed quick-actions runs.
 */
import { chromium } from "playwright";
import { STATE_PATH } from "../lib/auth.ts";
import { BASE_URL as BASE } from "../lib/env.ts";

const SCRATCH = process.env.SCRATCH ?? "/tmp";
const PROJECT = "6a4adad69a876dea0d2d112e";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  storageState: STATE_PATH,
  viewport: { width: 1280, height: 800 },
  colorScheme: "dark",
});
const page = await context.newPage();
await page.goto(`${BASE}/editor/${PROJECT}/canvas`, { waitUntil: "domcontentloaded" });
await page.waitForLoadState("networkidle").catch(() => {});
await page.waitForTimeout(6000);
await page.getByRole("button", { name: "Skip for now" }).click({ force: true, timeout: 3000 }).catch(() => {});
console.log("node count:", await page.locator(".react-flow__node").count());

await page.getByRole("button", { name: "Open Flowy chat" }).click({ force: true });
await page.waitForTimeout(3000);
await page.screenshot({ path: `${SCRATCH}/qa2-chat.png` });
const log = page.locator("[role='log']");
console.log((await log.innerText().catch(() => "no log")).slice(-3000));
await browser.close();
