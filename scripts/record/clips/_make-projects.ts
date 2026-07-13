/**
 * Helper (excluded from run.ts by the "_" prefix): create N fresh projects
 * and print their editor ids. Used to stage fresh canvases for AI clips.
 *
 *   ../node_modules/.bin/tsx clips/_make-projects.ts <count>
 */
import { chromium } from "playwright";
import { STATE_PATH } from "../lib/auth.ts";
import { BASE_URL } from "../lib/env.ts";

const COUNT = Number(process.argv[2] ?? 1);

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  storageState: STATE_PATH,
  viewport: { width: 1280, height: 800 },
});

for (let i = 0; i < COUNT; i++) {
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/dashboard/projects/all`, { waitUntil: "domcontentloaded" });
  const createBtn = page.getByRole("button", { name: "Create a new project" });
  await createBtn.waitFor({ state: "visible", timeout: 30_000 });
  await createBtn.click();
  const start = page.getByRole("button", { name: "Start creating" });
  await start.waitFor({ state: "visible", timeout: 15_000 });
  await start.click();
  await page.waitForURL(/\/editor\//, { timeout: 60_000 });
  // Dismiss the first-run overlay so it doesn't pollute recordings.
  await page
    .getByRole("button", { name: "Skip for now" })
    .click({ timeout: 15_000 })
    .catch(() => {});
  await page.waitForTimeout(1500);
  const m = page.url().match(/\/editor\/([a-f0-9]+)/);
  console.log(`project ${i}: ${m?.[1] ?? page.url()}`);
  await page.close();
}

await browser.close();
