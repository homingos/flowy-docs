/**
 * Setup (excluded from run.ts): directly generate the two Dawn Drift frame
 * image nodes (prompts already set). Keeps the session alive until both
 * images exist — generations orphaned by a closed client never finish.
 */
import { chromium } from "playwright";
import { STATE_PATH } from "../lib/auth.ts";
import { BASE_URL as BASE } from "../lib/env.ts";

const FRAME_IDS = [
  "image_a86ed7f78a4d47b485942c7280e6c8de",
  "image_1006d24cd46d4635bdad8a147c042b67",
];
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  storageState: STATE_PATH,
  viewport: { width: 1280, height: 800 },
  colorScheme: "dark",
});
await context.addInitScript(() => {
  const style = document.createElement("style");
  style.textContent = '[data-testid="react-grab-overlay"] { display: none !important; }';
  document.addEventListener("DOMContentLoaded", () => document.head.appendChild(style));
});
const page = await context.newPage();
await page.goto(`${BASE}/editor/6a4adad69a876dea0d2d112e/canvas`, { waitUntil: "domcontentloaded" });
await page.waitForLoadState("networkidle").catch(() => {});
await page.waitForTimeout(5000);
await page.getByRole("button", { name: "Skip for now" }).click({ force: true, timeout: 3000 }).catch(() => {});

for (const id of FRAME_IDS) {
  const node = page.locator(`.react-flow__node[data-id="${id}"]`);
  let b = await node.boundingBox();
  if (!b) {
    await page.keyboard.press("Shift+Digit1");
    await page.waitForTimeout(900);
    b = await node.boundingBox();
  }
  if (!b) {
    console.log(`${id}: NOT FOUND`);
    continue;
  }
  // Zoom until clickable size, cursor-centered.
  for (let i = 0; i < 30; i++) {
    b = await node.boundingBox();
    if (!b) break;
    if (b.width >= 300 && b.width <= 640) break;
    const dir = b.width < 300 ? -140 : 140;
    await page.mouse.move(
      Math.max(10, Math.min(1270, b.x + b.width / 2)),
      Math.max(10, Math.min(790, b.y + b.height / 2)),
    );
    await page.keyboard.down("Meta");
    await page.mouse.wheel(0, dir);
    await page.keyboard.up("Meta");
    await page.waitForTimeout(200);
  }
  b = await node.boundingBox();
  if (!b) {
    console.log(`${id}: lost during zoom`);
    continue;
  }
  // Select + hover to reveal Generate.
  await page.mouse.click(b.x + b.width * 0.4, b.y + 4);
  await page.waitForTimeout(600);
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.waitForTimeout(900);
  const gen = node.getByRole("button", { name: "Generate" }).first();
  if (await gen.isVisible().catch(() => false)) {
    await gen.click({ force: true });
    console.log(`${id}: Generate clicked`);
  } else {
    console.log(`${id}: Generate button not visible; node text: ${((await node.textContent()) ?? "").slice(0, 80)}`);
  }
  await page.waitForTimeout(1500);
}

// Stay alive until both images exist (up to 15 min).
for (let i = 0; i < 90; i++) {
  const state = await page.evaluate(`(() => {
    const g = (id) => {
      const el = document.querySelector('.react-flow__node[data-id="' + id + '"]');
      if (!el) return "missing";
      if (el.querySelector("img")) return "img";
      return (el.textContent || "").includes("Generating") ? "generating" : "empty";
    };
    return [g("${FRAME_IDS[0]}"), g("${FRAME_IDS[1]}")];
  })()`);
  const [a, b] = state as [string, string];
  if (i % 3 === 0 || (a === "img" && b === "img")) console.log(`poll ${i}: first=${a} last=${b}`);
  if (a === "img" && b === "img") break;
  await page.waitForTimeout(10_000);
}
await browser.close();
