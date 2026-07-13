/**
 * Probe (excluded from run.ts): spawn a Video node next to a generated image
 * on masai maara, wire image → video, inspect for the Motion path section,
 * open the draw editor, dump its aria, then clean up the spawned node.
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
await page.goto(`${BASE}/editor/6a4adad69a876dea0d2d112e/canvas`, { waitUntil: "domcontentloaded" });
await page.waitForLoadState("networkidle").catch(() => {});
await page.waitForTimeout(6000);
await page.getByRole("button", { name: "Skip for now" }).click({ force: true, timeout: 3000 }).catch(() => {});
await page.keyboard.press("Shift+Digit1");
await page.waitForTimeout(1000);

// Zoom towards a generated image node.
const img = page
  .locator(".react-flow__node-staticImageBlock")
  .filter({ has: page.locator("img[alt='Generated result']") })
  .first();
let b = await img.boundingBox();
if (!b) throw new Error("no image node");
await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
await page.keyboard.down("Meta");
for (let i = 0; i < 14; i++) {
  b = await img.boundingBox();
  if (!b || b.width > 300) break;
  await page.mouse.wheel(0, -120);
  await page.waitForTimeout(150);
}
await page.keyboard.up("Meta");
b = await img.boundingBox();
if (!b) throw new Error("image left view");

const ids = async () =>
  page.evaluate(() => Array.from(document.querySelectorAll(".react-flow__node")).map((el) => el.getAttribute("data-id")));
const before = await ids();

// Spawn a Video node in open space right of the image.
await page.mouse.move(Math.min(b.x + b.width + 380, 1700), b.y + b.height / 2);
await page.waitForTimeout(300);
await page.keyboard.press("Shift+V");
await page.waitForTimeout(1500);
const after = await ids();
const newId = after.find((id) => !before.includes(id));
console.log("new node id:", newId);
if (!newId) throw new Error("video node did not spawn");
const vid = page.locator(`.react-flow__node[data-id="${newId}"]`);
const vb = await vid.boundingBox();
if (!vb) throw new Error("no video box");

// Wire image output -> video input, using the real handle elements.
await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
await page.waitForTimeout(600); // hover so handles appear
const srcHandle = img.locator(".react-flow__handle.source, .react-flow__handle-right").first();
const sb = (await srcHandle.boundingBox()) ?? { x: b.x + b.width + 14, y: b.y + b.height / 2 + 12, width: 0, height: 0 };
await page.mouse.move(vb.x + vb.width / 2, vb.y + vb.height / 2);
await page.waitForTimeout(400);
const dstHandle = vid.locator(".react-flow__handle.target, .react-flow__handle-left").first();
const db = (await dstHandle.boundingBox()) ?? { x: vb.x - 8, y: vb.y + vb.height / 2, width: 0, height: 0 };
console.log("src handle:", JSON.stringify(sb), "dst handle:", JSON.stringify(db));
await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2, { steps: 20 });
await page.waitForTimeout(300);
await page.mouse.down();
await page.mouse.move(db.x + db.width / 2, db.y + db.height / 2, { steps: 35 });
await page.waitForTimeout(200);
await page.mouse.up();
await page.waitForTimeout(1200);
const edges = await page.evaluate(() => document.querySelectorAll(".react-flow__edge").length);
console.log("edge count after drag:", edges);

// Select the video node and dump its settings panel.
await page.mouse.click(vb.x + vb.width * 0.4, vb.y + 8);
await page.waitForTimeout(1500);
await page.screenshot({ path: `${SCRATCH}/mp2-panel.png` });
const snap = await page.locator("body").ariaSnapshot();
console.log(snap.split("\n").filter((l) => /motion|Draw/i.test(l)).join("\n") || "NO motion-path lines");

// Try opening the draw editor if present.
const draw = page.getByRole("button", { name: /Draw motion path/i });
if (await draw.isVisible().catch(() => false)) {
  await draw.click({ force: true });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${SCRATCH}/mp2-editor.png` });
  const esnap = await page.locator("body").ariaSnapshot();
  const el = esnap.split("\n");
  const i0 = el.findIndex((l) => /motion/i.test(l));
  console.log("--- editor aria ---");
  console.log(el.slice(Math.max(0, i0 - 2), i0 + 40).join("\n"));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(800);
}

// Clean up: delete the spawned node.
await page.mouse.click(vb.x + vb.width * 0.4, vb.y + 8);
await page.waitForTimeout(500);
await page.keyboard.press("Backspace");
await page.waitForTimeout(800);
console.log("final node count:", (await ids()).length, "orig:", before.length);
await browser.close();
