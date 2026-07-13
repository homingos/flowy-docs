/**
 * Setup probe (excluded from run.ts): seed a learned skill in the AI chat
 * project so the ai-memory clip's Skill library isn't empty. Also validates
 * how the composer sends (Enter vs Send click).
 *
 *   FE_ROOT=… SCRATCH=… ../node_modules/.bin/tsx clips/_seed-skill.ts
 */
import { chromium } from "playwright";
import { STATE_PATH } from "../lib/auth.ts";
import { BASE_URL as BASE } from "../lib/env.ts";

const SCRATCH = process.env.SCRATCH ?? "/tmp";
const PROJECT = "6a4b7988514413fa84caca94"; // Midnight Meadow (AI-chat sandbox)

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  storageState: STATE_PATH,
  viewport: { width: 1280, height: 800 },
  colorScheme: "dark",
});
const page = await context.newPage();

await page.goto(`${BASE}/editor/${PROJECT}/canvas`, { waitUntil: "domcontentloaded" });
await page.waitForLoadState("networkidle").catch(() => {});
await page.waitForTimeout(3000);
await page.getByRole("button", { name: "Skip for now" }).click({ timeout: 3000 }).catch(() => {});
await page.getByRole("button", { name: "Not now" }).click({ timeout: 2000 }).catch(() => {});

await page.getByRole("button", { name: "Open Flowy chat" }).click();
const composer = page.getByRole("textbox", { name: "Ask Flowy to build, wire, or generate…" });
await composer.waitFor({ state: "visible", timeout: 15_000 });

// Switch to Auto mode so the build runs without a confirm card.
await page.getByRole("button", { name: "Review" }).click().catch(() => {});
await page.waitForTimeout(800);
await page.screenshot({ path: `${SCRATCH}/seed-modes.png` });
const auto = page.getByRole("menuitem", { name: /Auto/ }).or(page.getByRole("option", { name: /Auto/ })).or(page.getByText("Auto", { exact: true }));
await auto.first().click({ timeout: 3000 }).catch(() => console.log("no Auto option found"));
await page.waitForTimeout(600);

await composer.click();
await page.keyboard.type(
  "Create a text node containing a short product brief for a ceramic mug ad, warm golden-hour mood. Then save this setup as a skill called 'Product brief starter'.",
  { delay: 5 },
);
await page.waitForTimeout(400);
// Try Enter first.
await page.keyboard.press("Enter");
await page.waitForTimeout(1500);
const cleared = (await composer.innerText().catch(() => "")).trim() === "" &&
  (await composer.inputValue().catch(() => "")).trim() === "";
console.log("composer cleared after Enter:", cleared);
if (!cleared) {
  await page.getByRole("button", { name: "Send" }).click().catch((e) => console.log("send click failed:", e.message));
  await page.waitForTimeout(1500);
}
await page.screenshot({ path: `${SCRATCH}/seed-sent.png` });

// Wait for the turn to finish (Stop button appears then hides).
await page.getByRole("button", { name: "Stop" }).waitFor({ state: "visible", timeout: 20_000 }).catch(() => {});
await page.getByRole("button", { name: "Stop" }).waitFor({ state: "hidden", timeout: 240_000 }).catch(() => {});
await page.waitForTimeout(2000);
await page.screenshot({ path: `${SCRATCH}/seed-done.png` });

// Open the skill library and report its contents.
await page.getByRole("button", { name: "Skill library" }).click();
await page.waitForTimeout(1500);
await page.screenshot({ path: `${SCRATCH}/seed-skills.png` });
console.log((await page.locator("body").ariaSnapshot()).split("\n").slice(0, 80).join("\n"));

await browser.close();
