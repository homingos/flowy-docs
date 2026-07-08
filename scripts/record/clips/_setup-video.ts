/**
 * Setup (excluded from run.ts): have the assistant build two wired Video
 * nodes on masai maara — one Default-engine first/last-frames setup, one
 * Compose-mode multi-element setup. Builds only; nothing generates.
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
await page.goto(`${BASE}/editor/6a4adad69a876dea0d2d112e/canvas`, { waitUntil: "domcontentloaded" });
await page.waitForLoadState("networkidle").catch(() => {});
await page.waitForTimeout(5000);
await page.getByRole("button", { name: "Skip for now" }).click({ force: true, timeout: 3000 }).catch(() => {});

await page.getByRole("button", { name: "Open Flowy chat" }).click({ force: true });
const composer = page.getByRole("textbox", { name: "Ask Flowy to build, wire, or generate…" });
await composer.waitFor({ state: "visible", timeout: 15_000 });
await page.getByRole("button", { name: "New chat" }).click({ force: true, timeout: 4000 }).catch(() => {});
await page.waitForTimeout(800);

async function send(msg: string) {
  await composer.click({ force: true });
  await page.keyboard.type(msg, { delay: 4 });
  await page.keyboard.press("Enter");
  // Wait for the turn to settle (idle composer returns).
  await page.waitForTimeout(3000);
  await composer.waitFor({ state: "visible", timeout: 300_000 });
  await page.waitForTimeout(1500);
}

await send(
  "Create a Video node named 'Dawn to Dusk' using the Default engine: connect two similar wide landscape images from this canvas as first and last frames (image role: frames), write a one-line prompt about the savanna passing from dawn to dusk, set duration to 4 seconds and resolution to 480p. Build and wire only — do NOT generate.",
);
await send(
  "Now create a second Video node named 'Compose Test' in Compose mode: connect three distinct images from this canvas (an elephant shot, a giraffe shot, and a landscape) as elements, write a prompt that references @Element1, @Element2 and @Element3 composing one scene, set duration 4 seconds and resolution 480p. Build and wire only — do NOT generate.",
);

// Report resulting video nodes.
const nodes = await page.evaluate(() =>
  Array.from(document.querySelectorAll(".react-flow__node"))
    .map((el) => ({
      id: el.getAttribute("data-id"),
      cls: Array.from(el.classList).filter((c) => c.startsWith("react-flow__node-")).join(","),
      text: (el.textContent ?? "").slice(0, 50),
    }))
    .filter((n) => /video/i.test(n.cls) || /Dawn|Compose/i.test(n.text)),
);
console.log(JSON.stringify(nodes, null, 1));
await browser.close();
