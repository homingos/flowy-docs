/**
 * Probe (excluded from run.ts): screenshot the current Flowy chat thread.
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
await page.getByRole("button", { name: "Open Flowy chat" }).click({ force: true });
await page.waitForTimeout(2500);
await page.screenshot({ path: `${SCRATCH}/chat-thread.png` });
// Scroll the chat up a bit for more context.
const dock = page.locator("aside").last();
await dock.hover().catch(() => {});
await page.mouse.wheel(0, -600);
await page.waitForTimeout(800);
await page.screenshot({ path: `${SCRATCH}/chat-thread-up.png` });
await browser.close();
