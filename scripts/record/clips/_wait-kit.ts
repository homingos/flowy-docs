/**
 * Probe (excluded from run.ts): poll headlessly until a domain's brand kit
 * reaches a terminal status. Usage: DOMAIN=github.com tsx clips/_wait-kit.ts
 */
import { chromium } from "playwright";
import { STATE_PATH } from "../lib/auth.ts";
import { BASE_URL as BASE } from "../lib/env.ts";

const WORKSPACE = "6a4ad8079a876dea0d2d111a";
const DOMAIN = process.env.DOMAIN ?? "github.com";
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ storageState: STATE_PATH, viewport: { width: 1280, height: 800 } });
const page = await context.newPage();
await page.goto(`${BASE}/dashboard/brandkit`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2000);
const t0 = Date.now();
for (let i = 0; i < 120; i++) {
  const status = await page.evaluate(
    async ({ ws, domain }) => {
      try {
        const sess = await (await fetch("/api/auth/session")).json();
        const res = await fetch(`/api/brand-kit/getall?workspace_id=${encodeURIComponent(ws)}&view=summary`, {
          headers: sess?.accessToken ? { Authorization: `Bearer ${sess.accessToken}` } : {},
        });
        const json = await res.json();
        const list = (json?.data?.brandkits ?? []) as Array<{ domain?: string; status?: string }>;
        return list.find((k) => k.domain === domain)?.status ?? "absent";
      } catch {
        return "error";
      }
    },
    { ws: WORKSPACE, domain: DOMAIN },
  );
  const elapsed = Math.round((Date.now() - t0) / 1000);
  if (status === "success" || status === "failed") {
    console.log(`${DOMAIN}: ${status} after ${elapsed}s of watching`);
    break;
  }
  if (i % 6 === 0) console.log(`${DOMAIN}: ${status} (${elapsed}s)`);
  await page.waitForTimeout(15_000);
}
await browser.close();
