/**
 * Probe (excluded from run.ts): Midnight Meadow node states + the stubborn
 * empty image node's inner aria.
 */
import { chromium } from "playwright";
import { STATE_PATH } from "../lib/auth.ts";
import { BASE_URL as BASE } from "../lib/env.ts";

const SCRATCH = process.env.SCRATCH ?? "/tmp";
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  storageState: STATE_PATH,
  viewport: { width: 1920, height: 1080 },
  colorScheme: "dark",
});
await context.addInitScript(() => {
  const style = document.createElement("style");
  style.textContent = '[data-testid="react-grab-overlay"] { display: none !important; }';
  document.addEventListener("DOMContentLoaded", () => document.head.appendChild(style));
});
const page = await context.newPage();
await page.goto(`${BASE}/editor/6a4b7988514413fa84caca94/canvas`, { waitUntil: "domcontentloaded" });
await page.waitForLoadState("networkidle").catch(() => {});
await page.waitForTimeout(5000);
await page.getByRole("button", { name: "Skip for now" }).click({ force: true, timeout: 3000 }).catch(() => {});
await page.keyboard.press("Shift+Digit1");
await page.waitForTimeout(1000);

const nodes = await page.evaluate(() =>
  Array.from(document.querySelectorAll(".react-flow__node")).map((el) => ({
    id: el.getAttribute("data-id"),
    cls: Array.from(el.classList).filter((c) => c.startsWith("react-flow__node-")).join(","),
    text: (el.textContent ?? "").slice(0, 60),
  })),
);
console.log(JSON.stringify(nodes, null, 1));
await page.screenshot({ path: `${SCRATCH}/mm-state.png` });

const target = page.locator('.react-flow__node[data-id="image_e3c2c3a9671c47ca91b4cdd22efa9888"]');
if ((await target.count()) > 0) {
  const b = await target.boundingBox();
  console.log("target box:", JSON.stringify(b));
  if (b) {
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 10 });
    await page.waitForTimeout(1000);
  }
  console.log("--- target aria (hovered) ---");
  console.log(await target.ariaSnapshot());
  // Reproduce the clip's exact sequence.
  const b2 = await target.boundingBox();
  if (b2) {
    await page.mouse.click(b2.x + b2.width * 0.4, b2.y + 8);
    await page.waitForTimeout(1200);
    const gen = target.getByRole("button", { name: "Generate" });
    console.log("after select, Generate visible:", await gen.isVisible().catch(() => false));

    const ratio = page.getByRole("combobox", { name: "Aspect ratio" });
    console.log("ratio combobox visible:", await ratio.isVisible().catch(() => false));
    await ratio.selectOption({ label: "3:2" }).then(() => console.log("ratio ok"), (e) => console.log("ratio ERR:", String(e).slice(0, 120)));
    await page.waitForTimeout(800);
    const size = page.getByRole("combobox", { name: "Size" });
    await size.selectOption({ label: "1K" }).then(() => console.log("size ok"), (e) => console.log("size ERR:", String(e).slice(0, 120)));
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${SCRATCH}/mm-after-combo.png` });

    const b3 = await target.boundingBox();
    console.log("box after combos:", JSON.stringify(b3));
    if (b3) {
      await page.mouse.move(b3.x + b3.width / 2, b3.y + b3.height / 2, { steps: 8 });
      await page.waitForTimeout(900);
    }
    console.log("hover after combos, Generate visible:", await gen.isVisible().catch(() => false));
    if (b3 && !(await gen.isVisible().catch(() => false))) {
      await page.mouse.click(b3.x + b3.width * 0.4, b3.y + 8);
      await page.waitForTimeout(900);
      await page.mouse.move(b3.x + b3.width / 2, b3.y + b3.height / 2, { steps: 8 });
      await page.waitForTimeout(900);
      console.log("after re-click, Generate visible:", await gen.isVisible().catch(() => false));
      await page.screenshot({ path: `${SCRATCH}/mm-reclick.png` });
      console.log(await target.ariaSnapshot());
    }
  }
}
// Credits chip — did the stuck generations charge anything?
const snap = await page.locator("body").ariaSnapshot();
console.log(snap.split("\n").filter((l) => /credits available/.test(l)).join("\n"));
await browser.close();
