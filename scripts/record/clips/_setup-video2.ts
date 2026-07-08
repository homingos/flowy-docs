/**
 * Setup (excluded from run.ts): assistant builds a fresh first/last-frames
 * video node on masai maara (the previous one is stuck mid-generation).
 * Build only — no generation.
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
await composer.click({ force: true });
await page.keyboard.type(
  "Create a Video node named 'Sunrise Sweep' using the Default engine, placed in empty space far from other nodes: connect two similar wide savanna landscape images as first and last frames (image role: frames), one-line prompt about morning light sweeping across the plain, duration 4 seconds, resolution 480p. Build and wire only — do NOT generate.",
  { delay: 4 },
);
await page.keyboard.press("Enter");
await page.waitForTimeout(3000);
await composer.waitFor({ state: "visible", timeout: 300_000 });
await page.waitForTimeout(1500);

const nodes = await page.evaluate(() =>
  Array.from(document.querySelectorAll(".react-flow__node"))
    .map((el) => ({ id: el.getAttribute("data-id"), text: (el.textContent ?? "").slice(0, 40) }))
    .filter((n) => /Sunrise Sweep/i.test(n.text)),
);
console.log(JSON.stringify(nodes));
await browser.close();
