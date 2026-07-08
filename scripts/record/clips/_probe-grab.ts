/**
 * Probe (excluded from run.ts): identify the react-grab dev toolbar's DOM so
 * the recorder can hide it.
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
await page.goto(`${BASE}/editor/6a4b7988514413fa84caca94/canvas`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(5000);

const report = await page.evaluate(() => {
  const out: string[] = [];
  const els = document.querySelectorAll(
    "[data-react-grab], [data-testid*='react-grab'], react-grab, #react-grab, [class*='react-grab'], [id*='react-grab'], [data-agentation], [id*='agentation'], [class*='agentation']",
  );
  els.forEach((el) => {
    const r = (el as HTMLElement).getBoundingClientRect?.();
    out.push(
      `${el.tagName}#${el.id || "-"} class=${(el as HTMLElement).className?.toString?.().slice(0, 80)} testid=${el.getAttribute("data-testid")} rect=${r ? `${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}` : "?"} parent=${el.parentElement?.tagName}#${el.parentElement?.id || "-"}`,
    );
  });
  // Also: what element sits at the pill location (640, 771)?
  const at = document.elementsFromPoint(640, 771).slice(0, 6).map((el) => {
    return `${el.tagName}#${el.id || "-"} class=${(el as HTMLElement).className?.toString?.().slice(0, 100)}`;
  });
  return { matched: out, atPoint: at };
});
console.log(JSON.stringify(report, null, 2));
await browser.close();
