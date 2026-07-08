/**
 * Setup (excluded from run.ts): put content into Dawn Drift's two frame
 * image nodes — assistant writes prompts and generates the IMAGES only.
 */
import { chromium } from "playwright";
import { STATE_PATH } from "../lib/auth.ts";
import { BASE_URL as BASE } from "../lib/env.ts";

const FIRST = "image_a86ed7f78a4d47b485942c7280e6c8de";
const LAST = "image_1006d24cd46d4635bdad8a147c042b67";
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
const composer = page.getByRole("textbox", { name: "Ask Flowy to build, wire, or generate…" });
await composer.waitFor({ state: "visible", timeout: 15_000 });
await page.getByRole("button", { name: "New chat" }).click({ force: true, timeout: 4000 }).catch(() => {});
await page.waitForTimeout(800);
await composer.click({ force: true });
await page.keyboard.type(
  "On the image nodes 'Dawn Drift — First Frame' and 'Dawn Drift — Last Frame': set prompts (first: wide savanna plain in pre-dawn cool silver light, single acacia tree on the horizon; last: the SAME wide savanna plain and acacia tree bathed in warm golden sunrise light, sun just above the horizon) and GENERATE those two images now. Only those two image nodes — do NOT touch or generate the 'Dawn Drift' video node.",
  { delay: 4 },
);
await page.keyboard.press("Enter");
await page.waitForTimeout(3000);
await composer.waitFor({ state: "visible", timeout: 600_000 });

// Wait for both images to actually hold content.
for (let i = 0; i < 60; i++) {
  const state = await page.evaluate(
    ([a, b]) => {
      const g = (id: string) => {
        const el = document.querySelector(`.react-flow__node[data-id="${id}"]`);
        if (!el) return "missing";
        if (el.querySelector("img")) return "img";
        return (el.textContent ?? "").includes("Generating") ? "generating" : "empty";
      };
      return [g(a), g(b)];
    },
    [FIRST, LAST] as [string, string],
  );
  console.log(`poll ${i}: first=${state[0]} last=${state[1]}`);
  if (state[0] === "img" && state[1] === "img") break;
  await page.waitForTimeout(10_000);
}
await browser.close();
