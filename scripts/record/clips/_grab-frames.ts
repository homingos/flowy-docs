/**
 * Setup (excluded from run.ts): capture the two savanna stills wired into
 * Sunrise Sweep (rendered at high zoom), then upload them into Dawn Drift's
 * empty first/last frame nodes via their file inputs. No generation.
 */
import { chromium } from "playwright";
import { STATE_PATH } from "../lib/auth.ts";
import { BASE_URL as BASE } from "../lib/env.ts";

const SCRATCH = process.env.SCRATCH ?? "/tmp";
const SS = "video_d645604076a84d10aa328be3e7061b48";
const TARGETS = [
  "image_a86ed7f78a4d47b485942c7280e6c8de", // Dawn Drift — First Frame
  "image_1006d24cd46d4635bdad8a147c042b67", // Dawn Drift — Last Frame
];
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
await page.goto(`${BASE}/editor/6a4adad69a876dea0d2d112e/canvas`, { waitUntil: "domcontentloaded" });
await page.waitForLoadState("networkidle").catch(() => {});
await page.waitForTimeout(6000);
await page.getByRole("button", { name: "Skip for now" }).click({ force: true, timeout: 3000 }).catch(() => {});
await page.keyboard.press("Shift+Digit1");
await page.waitForTimeout(1200);

// Find the two image nodes nearest to (and left of) Sunrise Sweep.
const ssBox = await page.locator(`.react-flow__node[data-id="${SS}"]`).boundingBox();
if (!ssBox) throw new Error("Sunrise Sweep not in view");
const near = (await page.evaluate(`(() => {
  const out = [];
  for (const n of Array.from(document.querySelectorAll(".react-flow__node"))) {
    const id = n.getAttribute("data-id") || "";
    if (!id.startsWith("image_")) continue;
    if (!n.querySelector("img")) continue;
    const r = n.getBoundingClientRect();
    out.push({ id, x: r.x, y: r.y });
  }
  return out;
})()`)) as Array<{ id: string; x: number; y: number }>;
const sources = near
  .filter((n) => !TARGETS.includes(n.id))
  .map((n) => ({ ...n, d: Math.hypot(n.x - ssBox.x, n.y - ssBox.y) }))
  .sort((a, b) => a.d - b.d)
  .slice(0, 2);
console.log("source stills:", JSON.stringify(sources));
if (sources.length < 2) throw new Error("need two source stills");

// Capture each at high zoom.
const files: string[] = [];
for (let s = 0; s < 2; s++) {
  const node = page.locator(`.react-flow__node[data-id="${sources[s].id}"]`);
  for (let i = 0; i < 35; i++) {
    const b = await node.boundingBox();
    if (!b) break;
    if (b.width >= 640) break;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.keyboard.down("Meta");
    await page.mouse.wheel(0, -140);
    await page.keyboard.up("Meta");
    await page.waitForTimeout(180);
  }
  await page.waitForTimeout(2500); // let the hi-res load
  const img = node.locator("img").first();
  const path = `${SCRATCH}/frame-src-${s}.png`;
  await img.screenshot({ path });
  files.push(path);
  console.log(`captured ${path}`);
  await page.keyboard.press("Shift+Digit1");
  await page.waitForTimeout(1000);
}

// Upload into the Dawn Drift frame nodes.
for (let t = 0; t < 2; t++) {
  const node = page.locator(`.react-flow__node[data-id="${TARGETS[t]}"]`);
  const input = node.locator('input[type="file"]').first();
  await input.setInputFiles(files[t]);
  console.log(`uploaded ${files[t]} → ${TARGETS[t]}`);
  await page.waitForTimeout(3000);
}

// Wait until both frame nodes render an image.
for (let i = 0; i < 30; i++) {
  const state = await page.evaluate(`(() => {
    const g = (id) => {
      const el = document.querySelector('.react-flow__node[data-id="' + id + '"]');
      return el && el.querySelector("img") ? "img" : "empty";
    };
    return [g("${TARGETS[0]}"), g("${TARGETS[1]}")];
  })()`);
  const [a, b] = state as [string, string];
  console.log(`poll ${i}: first=${a} last=${b}`);
  if (a === "img" && b === "img") break;
  await page.waitForTimeout(5000);
}
// Also dump Dawn Drift's face controls for the take (prompt field?).
const dd = page.locator('.react-flow__node[data-id="video_09278dcb91c042d09b98c9aad7183119"]');
const controls = await dd.evaluate((el) => {
  const bits: string[] = [];
  for (const x of Array.from(el.querySelectorAll("textarea, input, [contenteditable], button"))) {
    bits.push(`${x.tagName}:${(x.getAttribute("placeholder") || x.getAttribute("aria-label") || (x.textContent || "")).trim().slice(0, 40)}`);
  }
  return bits;
}).catch(() => []);
console.log("Dawn Drift controls:", JSON.stringify(controls));
await browser.close();
