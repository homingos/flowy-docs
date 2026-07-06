import { chromium } from "playwright";
import { refreshStorageState } from "./lib/auth.ts";

const SCRATCH = process.env.SCRATCH ?? "/tmp";

try {
  const state = await refreshStorageState();
  const b = await chromium.launch({ headless: true });
  const c = await b.newContext({ storageState: state });
  const p = await c.newPage();
  await p.goto("http://localhost:3000/dashboard", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(5000);
  console.log("landed at:", p.url());
  await p.screenshot({ path: `${SCRATCH}/dash-probe.png` });
  await b.close();
} catch (err) {
  console.error("PROBE FAILED:", err instanceof Error ? err.message : err);
  process.exit(1);
}
