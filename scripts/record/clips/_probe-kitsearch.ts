/**
 * Probe (excluded from run.ts): what does the canvas Brand Kit node's
 * kit-search panel actually list?
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
await page.getByRole("button", { name: "Add a node" }).click({ force: true });
await page.waitForTimeout(700);
await page.locator('[aria-label="Node selection"]').getByRole("button", { name: /^Brand Kit/ }).click({ force: true });
const search = page.getByRole("textbox", { name: /Search kits/ }).first();
await search.waitFor({ state: "visible", timeout: 10_000 });
await page.waitForTimeout(1000);
await page.screenshot({ path: `${SCRATCH}/kitsearch-empty.png` });

// With no query — list everything the panel shows.
const dump = async (label: string) => {
  const btns = await page.evaluate(() => {
    const out: string[] = [];
    for (const b of Array.from(document.querySelectorAll("button, [role='button'], [role='option'], li"))) {
      const r = (b as HTMLElement).getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && r.width < 600) {
        const t = (b.textContent ?? "").trim();
        if (t && t.length < 60) out.push(t);
      }
    }
    return out;
  });
  console.log(`--- ${label}: ${JSON.stringify(btns.slice(0, 40))}`);
};
await dump("no query");
await search.click({ force: true });
await page.keyboard.type("not", { delay: 40 });
await page.waitForTimeout(1500);
await dump("query 'not'");
await page.screenshot({ path: `${SCRATCH}/kitsearch-not.png` });
await page.keyboard.press("Meta+A");
await page.keyboard.type("fig", { delay: 40 });
await page.waitForTimeout(1500);
await dump("query 'fig'");
await browser.close();
