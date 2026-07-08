/**
 * Setup (excluded from run.ts): open the existing Flowy chat thread and click
 * any pending "Approve & build" plan card, then poll the frame images.
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
await page.getByRole("button", { name: "Skip for now" }).click({ force: true, timeout: 3000 }).catch(() => {});

await page.getByRole("button", { name: "Open Flowy chat" }).click({ force: true });
await page.waitForTimeout(2500);
// Dump visible buttons in the chat dock to find the approval control.
const btns = await page.evaluate(`Array.from(document.querySelectorAll("button"))
  .map((b) => (b.textContent || "").trim())
  .filter((t) => t && t.length < 40)`);
console.log("chat buttons:", JSON.stringify(btns));
const approve = page.getByRole("button", { name: /Approve/i }).first();
if (await approve.isVisible().catch(() => false)) {
  await approve.click({ force: true });
  console.log("clicked Approve");
} else {
  console.log("no Approve button visible");
}
// Poll the frame images for up to 12 minutes.
for (let i = 0; i < 72; i++) {
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
