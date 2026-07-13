/**
 * Probe (excluded from run.ts): brand kit statuses via the getall API.
 */
import { chromium } from "playwright";
import { STATE_PATH } from "../lib/auth.ts";
import { BASE_URL as BASE } from "../lib/env.ts";

const WORKSPACE = "6a4ad8079a876dea0d2d111a";
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ storageState: STATE_PATH, viewport: { width: 1280, height: 800 } });
const page = await context.newPage();
await page.goto(`${BASE}/dashboard/brandkit`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
const out = await page.evaluate(async (ws) => {
  const sess = await (await fetch("/api/auth/session")).json();
  const token =
    sess?.accessToken ?? sess?.access_token ?? sess?.user?.accessToken ?? sess?.token ?? null;
  const res = await fetch(`/api/brand-kit/getall?workspace_id=${encodeURIComponent(ws)}&view=summary`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const json = await res.json();
  const list = json?.data?.brandkits ?? [];
  return list.map((k: { domain?: string; status?: string; name?: string }) => `${k.domain} → ${k.status} (${k.name})`);
}, WORKSPACE);
console.log(JSON.stringify(out, null, 2));
await browser.close();
