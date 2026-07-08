/**
 * Interaction probe (excluded from run.ts by the "_" prefix): AI chat dock,
 * chat panel header, add-node menu entries, audio/vector/3d node surfaces.
 *
 *   SCRATCH=<dir> ../node_modules/.bin/tsx clips/_probe-ai.ts <which> [projectId]
 */
import { chromium } from "playwright";
import { STATE_PATH } from "../lib/auth.ts";
import { BASE_URL as BASE } from "../lib/env.ts";

const SCRATCH = process.env.SCRATCH ?? "/tmp";
const which = process.argv[2] ?? "chat";
const PROJECT = process.argv[3] ?? "6a4b5f371263d94b3dfbdbea";

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

async function snap(name: string, lines = 130) {
  await page.screenshot({ path: `${SCRATCH}/${name}.png` });
  const s = await page.locator("body").ariaSnapshot();
  console.log(`\n===== ${name} =====`);
  console.log(s.split("\n").slice(0, lines).join("\n"));
}

await page.goto(`${BASE}/editor/${PROJECT}/canvas`, { waitUntil: "domcontentloaded" });
await page.waitForLoadState("networkidle").catch(() => {});
await page.waitForTimeout(3000);
await page.getByRole("button", { name: "Skip for now" }).click({ timeout: 3000 }).catch(() => {});
await page.getByRole("button", { name: "Not now" }).click({ timeout: 2000 }).catch(() => {});

if (which === "chat") {
  await snap("p-canvas");
  // Open the chat panel via the dot-matrix launcher.
  await page.getByRole("button", { name: "Open Flowy chat" }).click({ force: true });
  await page.waitForTimeout(2000);
  await snap("p-chat-panel", 200);
} else if (which === "dock") {
  // Expand the bottom prompt dock.
  await page.getByRole("button", { name: "Open Flowy AI" }).click({ force: true });
  await page.waitForTimeout(1500);
  await snap("p-dock", 160);
} else if (which === "dock2") {
  // Expand the dock, focus the composer, and wait for suggestion chips.
  await page.getByRole("button", { name: "Open Flowy AI" }).click({ force: true });
  await page.waitForTimeout(1200);
  const composer = page.getByRole("textbox", { name: "Describe what you want to generate…" });
  await composer.waitFor({ state: "visible", timeout: 8000 });
  await page.waitForTimeout(2500);
  await snap("p-dock2", 220);
} else if (which === "addnode") {
  await page.getByRole("button", { name: "Add a node" }).click({ force: true });
  await page.waitForTimeout(1200);
  await snap("p-addnode", 160);
} else if (which === "audio") {
  await page.getByRole("button", { name: "Add a node" }).click({ force: true });
  await page.waitForTimeout(800);
  const menu = page.locator('[aria-label="Node selection"]');
  await menu.getByRole("button", { name: /Audio/ }).click({ force: true });
  await page.waitForTimeout(1500);
  await snap("p-audio-node", 200);
} else if (which === "3d") {
  await page.getByRole("button", { name: "Add a node" }).click({ force: true });
  await page.waitForTimeout(800);
  const menu = page.locator('[aria-label="Node selection"]');
  await menu.getByRole("button", { name: /3D/ }).click({ force: true });
  await page.waitForTimeout(1500);
  await snap("p-3d-node", 200);
}

await browser.close();
