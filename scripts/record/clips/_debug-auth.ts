/**
 * Debug probe (excluded from run.ts by the "_" prefix): visit a freshly
 * minted magic-link URL and report where it lands.
 *
 *   FE_ROOT=… SCRATCH=… ../node_modules/.bin/tsx clips/_debug-auth.ts
 */
import { chromium } from "playwright";
import { mintMagicLinkToken } from "../lib/auth.ts";

const SCRATCH = process.env.SCRATCH ?? "/tmp";
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
const token = mintMagicLinkToken("claude-user-3@flamapp.com");
await page.goto(
  `http://localhost:3000/auth/magic-link?token=${encodeURIComponent(token)}&callbackUrl=/dashboard`,
  { waitUntil: "domcontentloaded" },
);
await page.waitForTimeout(8000);
console.log("URL:", page.url());
await page.screenshot({ path: `${SCRATCH}/magic.png` });
console.log(await page.locator("body").innerText().then((t) => t.slice(0, 800)));
await browser.close();
