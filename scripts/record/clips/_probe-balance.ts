/**
 * Probe (excluded from run.ts): check the credit balance visible to an
 * arbitrary account (default claude-user-10) without touching .auth/state.json.
 */
import { chromium } from "playwright";
import { mintMagicLinkToken } from "../lib/auth.ts";
import { BASE_URL as BASE } from "../lib/env.ts";

const EMAIL = process.argv[2] ?? "claude-user-10@flamapp.com";
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();
const token = mintMagicLinkToken(EMAIL);
await page.goto(`${BASE}/auth/magic-link?token=${encodeURIComponent(token)}&callbackUrl=/dashboard`, {
  waitUntil: "domcontentloaded",
});
await page
  .waitForURL((u) => u.pathname === "/welcome" || /(^|\/)dashboard(\/|$)/.test(u.pathname), { timeout: 45_000 })
  .catch(() => console.log("no redirect; at", page.url()));
await page.waitForLoadState("networkidle").catch(() => {});
await page.waitForTimeout(2000);
console.log("url:", page.url());
const snap = await page.locator("body").ariaSnapshot();
console.log(snap.split("\n").filter((l) => /credit/i.test(l)).join("\n") || "no credit lines");
await browser.close();
