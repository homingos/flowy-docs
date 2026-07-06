import { chromium } from "playwright";
import { mintMagicLinkToken } from "./lib/auth.ts";
import { BASE_URL, RECORD_EMAIL } from "./lib/env.ts";

const SCRATCH = process.env.SCRATCH ?? "/tmp";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

page.on("console", (msg) => {
  if (["error", "warning"].includes(msg.type())) console.log(`[console.${msg.type()}]`, msg.text().slice(0, 300));
});
page.on("response", (res) => {
  if (res.status() >= 400) console.log(`[http ${res.status()}]`, res.url().slice(0, 140));
});

const token = mintMagicLinkToken(RECORD_EMAIL);
await page.goto(`${BASE_URL}/auth/magic-link?token=${encodeURIComponent(token)}&callbackUrl=/dashboard`);

for (const t of [3000, 6000, 12000]) {
  await page.waitForTimeout(t === 3000 ? 3000 : 3000);
  console.log(`t=${t}ms url=`, page.url());
}
await page.screenshot({ path: `${SCRATCH}/auth-probe.png` });
console.log("final url:", page.url());
await browser.close();
