/**
 * Probe (excluded from run.ts): can we pan the Wandering Sparrow canvas to
 * empty space so stray Brand Kit nodes stay out of the viewport? Dumps the
 * toolbar buttons, tries a hand-tool drag, reports what's visible after.
 */
import { chromium } from "playwright";
import { STATE_PATH } from "../lib/auth.ts";
import { BASE_URL as BASE } from "../lib/env.ts";

const SCRATCH = process.env.SCRATCH ?? "/tmp";
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  storageState: STATE_PATH,
  viewport: { width: 1280, height: 800 },
  colorScheme: "dark",
});
const page = await context.newPage();
await page.goto(`${BASE}/editor/6a4b79b9514413fa84caca9f/canvas`, { waitUntil: "domcontentloaded" });
await page.waitForLoadState("networkidle").catch(() => {});
await page.waitForTimeout(4000);
await page.getByRole("button", { name: "Skip for now" }).click({ force: true, timeout: 3000 }).catch(() => {});

// Toolbar inventory.
const btns = await page.evaluate(() =>
  Array.from(document.querySelectorAll("button"))
    .map((b) => b.getAttribute("aria-label") || b.getAttribute("title") || "")
    .filter(Boolean),
);
console.log("buttons:", JSON.stringify(btns));

// Try hand-tool pan: click the hand tool, drag the pane.
const hand = page.getByRole("button", { name: /hand|pan/i }).first();
const hasHand = await hand.isVisible().catch(() => false);
console.log("hand tool visible:", hasHand);
if (hasHand) await hand.click({ force: true });
await page.waitForTimeout(400);
await page.mouse.move(700, 400);
await page.mouse.down();
await page.mouse.move(150, 400, { steps: 25 });
await page.mouse.up();
await page.waitForTimeout(800);

// Back to pointer.
const pointer = page.getByRole("button", { name: /select|pointer|cursor/i }).first();
if (await pointer.isVisible().catch(() => false)) await pointer.click({ force: true });
await page.waitForTimeout(400);

// What brandkit strays are inside the viewport now?
const strays = await page.evaluate(() => {
  const out: Array<{ x: number; y: number }> = [];
  for (const el of Array.from(document.querySelectorAll('[data-testid^="rf__node-brandkit"]'))) {
    const r = el.getBoundingClientRect();
    if (r.right > 0 && r.left < 1280 && r.bottom > 0 && r.top < 800) out.push({ x: Math.round(r.x), y: Math.round(r.y) });
  }
  return out;
});
console.log("brandkit strays in viewport after pan:", JSON.stringify(strays));
await page.screenshot({ path: `${SCRATCH}/pan-after.png` });
await browser.close();
