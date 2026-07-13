/**
 * Setup (excluded from run.ts): assistant builds a 3D node on Midnight Meadow
 * wired from the Hero Shot mug image. Build only — no generation.
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
await page.goto(`${BASE}/editor/6a4b7988514413fa84caca94/canvas`, { waitUntil: "domcontentloaded" });
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
  "Create a 3D node named 'Mug Model' and connect the Hero Shot image into it as the reference. Build and wire only — do NOT generate.",
  { delay: 4 },
);
await page.keyboard.press("Enter");
await page.waitForTimeout(3000);
await composer.waitFor({ state: "visible", timeout: 300_000 });
await page.waitForTimeout(1500);

const nodes = await page.evaluate(() =>
  Array.from(document.querySelectorAll(".react-flow__node"))
    .map((el) => ({
      id: el.getAttribute("data-id"),
      cls: Array.from(el.classList).filter((c) => c.startsWith("react-flow__node-")).join(","),
      text: (el.textContent ?? "").slice(0, 40),
    }))
    .filter((n) => /3d|model/i.test(n.cls) || /Mug Model/i.test(n.text)),
);
console.log(JSON.stringify(nodes, null, 1));
await browser.close();
