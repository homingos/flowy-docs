/**
 * One-time seed: remix a few visually rich community templates into the demo
 * workspace so canvas clips never open on an empty canvas. Saves the resulting
 * project ids to clips/config.json.
 *
 *   ./node_modules/.bin/tsx setup/seed.ts [count]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { STATE_PATH, refreshStorageState } from "../lib/auth.ts";
import { BASE_URL } from "../lib/env.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = join(HERE, "..", "clips", "config.json");
const COUNT = Number(process.argv[2] ?? 3);

await refreshStorageState();
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  storageState: STATE_PATH,
  viewport: { width: 1440, height: 900 },
  colorScheme: "dark",
});
const page = await context.newPage();

const projects: Array<{ id: string; name: string }> = [];

for (let i = 0; i < COUNT; i++) {
  await page.goto(`${BASE_URL}/dashboard/community`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.getByRole("tab", { name: "Templates" }).click();
  await page.waitForTimeout(2500);

  // Prefer cards that actually have a thumbnail image.
  const cards = page.locator("article").filter({ has: page.locator("img") });
  const n = await cards.count();
  if (i >= n) break;
  const card = cards.nth(i);
  const name = (await card.locator("h3").first().textContent().catch(() => null))?.trim() ?? `template-${i}`;
  await card.click();

  const remix = page.getByRole("button", { name: "Remix" }).first();
  await remix.waitFor({ state: "visible", timeout: 15_000 });
  await remix.click();

  await page.waitForURL(/\/editor\/[^/]+\/canvas/, { timeout: 120_000 });
  const id = page.url().match(/\/editor\/([^/]+)\/canvas/)?.[1];
  if (id) {
    projects.push({ id, name });
    console.log(`remixed "${name}" → ${id}`);
  }
  // Let the canvas doc settle/persist before leaving.
  await page.waitForTimeout(6000);
}

let existing: { projects: Array<{ id: string; name: string }> } = { projects: [] };
try {
  existing = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
} catch {}
const merged = [...existing.projects, ...projects].filter(
  (p, i, arr) => arr.findIndex((q) => q.id === p.id) === i,
);
writeFileSync(CONFIG_PATH, JSON.stringify({ projects: merged }, null, 2) + "\n");
console.log(`config.json now has ${merged.length} project(s)`);
await browser.close();
