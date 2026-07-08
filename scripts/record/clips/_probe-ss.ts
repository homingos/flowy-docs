/**
 * Probe (excluded from run.ts): states of Sunrise Sweep + Dawn to Dusk.
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
await page.waitForTimeout(6000);
for (const [name, id] of [
  ["Sunrise Sweep", "video_d645604076a84d10aa328be3e7061b48"],
  ["Dawn to Dusk", "video_b3b733ff7bf443b585e387f42b9b554f"],
] as const) {
  const n = page.locator(`.react-flow__node[data-id="${id}"]`);
  const text = ((await n.textContent().catch(() => "missing")) ?? "").slice(0, 80);
  const src = await n.locator("video").first().getAttribute("src").catch(() => null);
  console.log(`${name}: text="${text}" | video=${src ? "YES" : "no"}`);
}
await browser.close();
