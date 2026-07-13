/**
 * Probe (excluded from run.ts): states of the Mug Model (3D) and Dawn to Dusk
 * (video) nodes after the failed takes.
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

// 3D node on Midnight Meadow.
await page.goto(`${BASE}/editor/6a4b7988514413fa84caca94/canvas`, { waitUntil: "domcontentloaded" });
await page.waitForLoadState("networkidle").catch(() => {});
await page.waitForTimeout(6000);
const d = page.locator('.react-flow__node[data-id="3d_435cbd280ec0408c98305b2dca6ab61a"]');
console.log("--- Mug Model (3D) ---");
console.log(await d.ariaSnapshot().catch(() => "missing"));

// Dawn to Dusk on masai maara.
await page.goto(`${BASE}/editor/6a4adad69a876dea0d2d112e/canvas`, { waitUntil: "domcontentloaded" });
await page.waitForLoadState("networkidle").catch(() => {});
await page.waitForTimeout(6000);
const v = page.locator('.react-flow__node[data-id="video_b3b733ff7bf443b585e387f42b9b554f"]');
console.log("--- Dawn to Dusk (video) ---");
console.log((await v.ariaSnapshot().catch(() => "missing")).split("\n").slice(0, 12).join("\n"));
const src = await v.locator("video").first().getAttribute("src").catch(() => null);
console.log("video src tail:", src ? src.slice(60, 120) : null);
await browser.close();
