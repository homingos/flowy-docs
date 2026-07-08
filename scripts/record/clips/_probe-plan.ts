/**
 * Probe (excluded from run.ts): trigger a plan proposal in the chat and dump
 * the plan card's aria so the plan-mode clip can drive its controls.
 *
 *   FE_ROOT=… SCRATCH=… ../node_modules/.bin/tsx clips/_probe-plan.ts [projectId]
 */
import { chromium } from "playwright";
import { STATE_PATH } from "../lib/auth.ts";
import { BASE_URL as BASE } from "../lib/env.ts";

const SCRATCH = process.env.SCRATCH ?? "/tmp";
const PROJECT = process.argv[2] ?? "6a4b79b9514413fa84caca9f"; // Wandering Sparrow

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

await page.goto(`${BASE}/editor/${PROJECT}/canvas`, { waitUntil: "domcontentloaded" });
await page.waitForLoadState("networkidle").catch(() => {});
await page.waitForTimeout(4000);
await page.getByRole("button", { name: "Skip for now" }).click({ timeout: 3000 }).catch(() => {});
await page.getByRole("button", { name: "Not now" }).click({ timeout: 2000 }).catch(() => {});
await page.screenshot({ path: `${SCRATCH}/plan-canvas.png` });

await page.getByRole("button", { name: "Open Flowy chat" }).click({ force: true });
const composer = page.getByRole("textbox", { name: "Ask Flowy to build, wire, or generate…" });
await composer.waitFor({ state: "visible", timeout: 15_000 });
await page.getByRole("button", { name: "New chat" }).click({ force: true, timeout: 4000 }).catch(() => {});
await page.waitForTimeout(800);

await composer.click({ force: true });
await page.keyboard.type(
  "Plan a 3-scene teaser for a handcrafted ceramic mug: a storyboard, one image node per scene, a video node for the hero scene, and a soundtrack audio node. Propose a plan first — don't build until I approve.",
  { delay: 5 },
);
await page.keyboard.press("Enter");

// Wait for the plan card (Approve button) to appear.
const approve = page.getByRole("button", { name: /Approve/ });
await approve.first().waitFor({ state: "visible", timeout: 240_000 }).catch(() => console.log("no Approve button appeared"));
await page.waitForTimeout(1500);
await page.screenshot({ path: `${SCRATCH}/plan-card.png` });
console.log((await page.locator("body").ariaSnapshot()).split("\n").slice(0, 160).join("\n"));

await browser.close();
