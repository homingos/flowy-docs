/**
 * Probe (excluded from run.ts): poll Dawn Drift frame images until both hold
 * content. No assistant interaction — safe to re-run.
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
await page.goto(`${BASE}/editor/6a4adad69a876dea0d2d112e/canvas`, { waitUntil: "domcontentloaded" });
await page.waitForLoadState("networkidle").catch(() => {});
await page.waitForTimeout(5000);
for (let i = 0; i < 90; i++) {
  const state = await page.evaluate(`(() => {
    const g = (id) => {
      const el = document.querySelector('.react-flow__node[data-id="' + id + '"]');
      if (!el) return "missing";
      if (el.querySelector("img")) return "img";
      return (el.textContent || "").includes("Generating") ? "generating" : "empty";
    };
    return [g("image_a86ed7f78a4d47b485942c7280e6c8de"), g("image_1006d24cd46d4635bdad8a147c042b67")];
  })()`);
  const [a, b] = state as [string, string];
  if (i % 3 === 0 || (a === "img" && b === "img")) console.log(`poll ${i}: first=${a} last=${b}`);
  if (a === "img" && b === "img") break;
  await page.waitForTimeout(10_000);
}
await browser.close();
