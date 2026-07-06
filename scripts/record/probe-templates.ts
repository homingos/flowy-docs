import { chromium } from "playwright";
import { STATE_PATH } from "./lib/auth.ts";
import { BASE_URL } from "./lib/env.ts";

const SCRATCH = process.env.SCRATCH ?? "/tmp";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  storageState: STATE_PATH,
  viewport: { width: 1280, height: 800 },
  colorScheme: "dark",
});
const page = await context.newPage();
await page.goto(`${BASE_URL}/dashboard/community`, { waitUntil: "domcontentloaded" });
await page.waitForLoadState("networkidle").catch(() => {});

await page.getByRole("tab", { name: "Templates" }).click();
await page.waitForTimeout(3000);
await page.screenshot({ path: `${SCRATCH}/templates.png` });

const snapshot = await page.locator("body").ariaSnapshot();
// print only the articles (template cards)
const lines = snapshot.split("\n");
let inArticle = false;
const out: string[] = [];
for (const l of lines) {
  if (/^- article/.test(l)) inArticle = true;
  else if (/^- \w/.test(l) && !/^- article/.test(l)) inArticle = false;
  if (inArticle) out.push(l);
}
console.log(out.slice(0, 80).join("\n"));

// open the first template detail to see the remix affordance
const first = page.locator("article").filter({ hasNot: page.locator('a[href^="/app/"]') }).first();
await first.click().catch(async () => {
  await page.locator("article").nth(0).click();
});
await page.waitForTimeout(3000);
console.log("\n--- after card click, url:", page.url());
await page.screenshot({ path: `${SCRATCH}/template-detail.png` });
console.log((await page.locator("body").ariaSnapshot()).split("\n").filter((l) => /button|heading|link/.test(l)).slice(0, 40).join("\n"));
await browser.close();
