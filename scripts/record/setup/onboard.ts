/**
 * One-time account setup: completes the /welcome onboarding gate
 * (Skip → pricing "Skip for now" → /dashboard) so recorded sessions
 * land straight on the dashboard.
 *
 *   ./node_modules/.bin/tsx setup/onboard.ts
 */
import { chromium } from "playwright";
import { STATE_PATH, refreshStorageState } from "../lib/auth.ts";
import { BASE_URL } from "../lib/env.ts";

const state = await refreshStorageState();
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ storageState: state });
const page = await context.newPage();

await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(3000);

if (page.url().includes("/welcome")) {
  console.log("completing onboarding…");
  await page.getByRole("button", { name: "Skip", exact: true }).click();
  // Pricing phase → "Skip for now" finishes onboarding.
  const skipForNow = page.getByRole("button", { name: /skip for now/i });
  await skipForNow.waitFor({ state: "visible", timeout: 20_000 });
  await skipForNow.click();
  await page.waitForURL((u) => /(^|\/)dashboard(\/|$)/.test(u.pathname), {
    timeout: 60_000,
  });
  console.log("onboarding complete →", page.url());
} else {
  console.log("already onboarded →", page.url());
}

// Persist the selectedWorkspaceId cookie the dashboard just set.
await context.storageState({ path: STATE_PATH });
await browser.close();
