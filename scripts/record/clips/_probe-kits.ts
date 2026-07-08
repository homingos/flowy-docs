/**
 * Probe (excluded from run.ts): list brand-kit gallery card names.
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
await page.goto(`${BASE}/dashboard/brandkit`, { waitUntil: "domcontentloaded" });
await page.waitForLoadState("networkidle").catch(() => {});
await page.waitForTimeout(3000);
const cards = await page.evaluate(() => {
  const out: string[] = [];
  for (const el of Array.from(document.querySelectorAll("*"))) {
    const t = el.textContent ?? "";
    if (/\.(com|so|app)$/.test(t.trim()) && t.trim().length < 30) {
      out.push(`${t.trim()} | parentText=${(el.parentElement?.textContent ?? "").slice(0, 60)}`);
    }
  }
  return Array.from(new Set(out));
});
console.log(cards.join("\n"));
await browser.close();
