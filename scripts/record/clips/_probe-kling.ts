/**
 * Probe (excluded from run.ts): state of the Compose Test node.
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
await page.waitForTimeout(6000);
const node = page.locator('.react-flow__node[data-id="video_06eb251052104a788849ae24d6d99434"]');
console.log(await node.ariaSnapshot().catch(() => "node missing"));
const v = await node.locator("video").first().getAttribute("src").catch(() => null);
console.log("video src:", v ? v.slice(0, 80) : null);

if (process.env.PANEL) {
  const b = await node.boundingBox();
  if (!b) throw new Error("no box");
  await page.mouse.click(b.x + Math.min(b.width * 0.4, 150), b.y + 6);
  await page.waitForTimeout(1500);
  const snap = await page.locator("body").ariaSnapshot();
  const lines = snap.split("\n");
  const i0 = lines.findIndex((l) => /complementary|Compose Test settings/i.test(l));
  console.log(lines.slice(Math.max(0, i0), i0 + 60).join("\n"));
  await browser.close();
  process.exit(0);
}
if (!v && process.env.TRY_GENERATE) {
  // Select the node, click Generate, and watch what happens for 10 minutes.
  const b = await node.boundingBox();
  if (!b) throw new Error("no box");
  await page.mouse.click(b.x + Math.min(b.width * 0.4, 150), b.y + 6);
  await page.waitForTimeout(800);
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 6 });
  await page.waitForTimeout(600);
  page.on("console", (m) => {
    if (m.type() === "error" || /generat|compose|kling|error|fail/i.test(m.text()))
      console.log("console:", m.type(), m.text().slice(0, 180));
  });
  page.on("response", (r) => {
    if (r.status() >= 400 && !/\.(png|jpg|webp|woff)/.test(r.url()))
      console.log("HTTP", r.status(), r.url().slice(0, 140));
  });
  const gen = node.getByRole("button", { name: "Generate" });
  console.log("generate visible:", await gen.isVisible().catch(() => false));
  await gen.click({ force: true });
  const start = Date.now();
  while (Date.now() - start < 120_000) {
    await page.waitForTimeout(8000);
    const src = await node.locator("video").first().getAttribute("src").catch(() => null);
    const text = ((await node.textContent().catch(() => "")) ?? "").slice(0, 90);
    const alerts = await page.locator("[role='alert'], [role='status']").allInnerTexts().catch(() => []);
    console.log(`${Math.round((Date.now() - start) / 1000)}s:`, src ? "VIDEO READY" : text, "| alerts:", alerts.filter(Boolean).join(" // ").slice(0, 200));
    if (src || /failed|try again|Generating/i.test(text)) break;
  }
}
await browser.close();
