/**
 * Probe (excluded from run.ts): find a drag recipe that reliably wires
 * image → (new) 3D node on masai maara. Verifies via the target node's aria.
 * Cleans up the spawned node afterwards.
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

// Zoom to a generated image.
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
  if (!b || b.width > 360) break;
  await page.mouse.wheel(0, -120);
  await page.waitForTimeout(140);
}
await page.keyboard.up("Meta");
b = await img.boundingBox();
if (!b) throw new Error("image gone");

const ids = async () =>
  page.evaluate(() => Array.from(document.querySelectorAll(".react-flow__node")).map((el) => el.getAttribute("data-id")));

// Spawn a 3D node to the right.
const before = await ids();
await page.mouse.move(Math.min(b.x + b.width + 320, 1180), Math.min(b.y + b.height / 2, 700));
await page.waitForTimeout(300);
await page.keyboard.press("Shift+D");
await page.waitForTimeout(1400);
const newId = (await ids()).find((id) => !before.includes(id));
if (!newId) throw new Error("3d node did not spawn");
const tgt = page.locator(`.react-flow__node[data-id="${newId}"]`);
console.log("3d node:", newId);

const connected = async () => {
  const aria = await tgt.ariaSnapshot().catch(() => "");
  return /connected|reference|input|img "/i.test(aria) && !/Drop|upload to start/i.test("");
};
const ariaOf = async () => (await tgt.ariaSnapshot().catch(() => "")).split("\n").slice(0, 14).join("\n");

console.log("--- before wire ---");
console.log(await ariaOf());

// Attempt: hover image edge, find handle element, pointer drag slowly.
for (const attempt of ["drop-on-handle", "handle-el"]) {
  b = await img.boundingBox();
  const t = await tgt.boundingBox();
  if (!b || !t) break;
  let from: { x: number; y: number } | null = null;
  if (attempt === "drop-on-handle") {
    // Source: image's right handle. Target: the 3D node's LEFT handle dot.
    await page.mouse.move(b.x + b.width - 4, b.y + b.height / 2, { steps: 10 });
    await page.waitForTimeout(700);
    from = await img
      .locator(".react-flow__handle")
      .evaluateAll((els, cx) => {
        const boxes = els.map((el) => el.getBoundingClientRect()).filter((r) => r.width > 0);
        const right = boxes.filter((r) => r.x + r.width / 2 > cx);
        const r = right[0];
        return r ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null;
      }, b.x + b.width / 2)
      .catch(() => null);
    if (from) {
      await page.mouse.move(from.x, from.y, { steps: 8 });
      await page.waitForTimeout(400);
      await page.mouse.down();
      await page.waitForTimeout(250);
      await page.mouse.move(from.x + 40, from.y, { steps: 8 });
      // hover target so its handles materialize mid-drag
      await page.mouse.move(t.x + t.width / 2, t.y + t.height / 2, { steps: 20 });
      await page.waitForTimeout(400);
      const drop = await tgt
        .locator(".react-flow__handle")
        .evaluateAll((els, cx) => {
          const boxes = els.map((el) => el.getBoundingClientRect()).filter((r) => r.width > 0);
          const left = boxes.filter((r) => r.x + r.width / 2 < cx);
          const r = left[0] ?? boxes[0];
          return r ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null;
        }, t.x + t.width / 2)
        .catch(() => null);
      console.log("drop point:", JSON.stringify(drop));
      await page.mouse.move(drop?.x ?? t.x - 4, drop?.y ?? t.y + t.height / 2, { steps: 14 });
      await page.waitForTimeout(350);
      await page.mouse.up();
      await page.waitForTimeout(1500);
      console.log("--- after drop-on-handle ---");
      console.log(await ariaOf());
    } else {
      console.log("drop-on-handle: no source handle");
    }
    continue;
  }
  if (attempt === "handle-el") {
    await page.mouse.move(b.x + b.width - 4, b.y + b.height / 2, { steps: 10 });
    await page.waitForTimeout(700);
    from = await img
      .locator(".react-flow__handle")
      .evaluateAll((els, cx) => {
        const boxes = els.map((el) => el.getBoundingClientRect()).filter((r) => r.width > 0);
        const right = boxes.filter((r) => r.x + r.width / 2 > cx);
        const r = right[0];
        return r ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null;
      }, b.x + b.width / 2)
      .catch(() => null);
  } else if (attempt === "edge-offset") {
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 6 });
    await page.waitForTimeout(500);
    from = { x: b.x + b.width + 6, y: b.y + b.height / 2 + 6 };
  } else {
    await page.mouse.move(b.x + b.width - 2, b.y + b.height / 2, { steps: 6 });
    await page.waitForTimeout(700);
    from = { x: b.x + b.width + 3, y: b.y + b.height / 2 };
  }
  if (!from) {
    console.log(attempt, ": no source point");
    continue;
  }
  console.log(attempt, "from", JSON.stringify(from));
  await page.mouse.move(from.x, from.y, { steps: 8 });
  await page.waitForTimeout(400);
  await page.mouse.down();
  await page.waitForTimeout(250);
  // Move out slowly first so react-flow registers the connection drag.
  await page.mouse.move(from.x + 30, from.y, { steps: 6 });
  await page.waitForTimeout(150);
  await page.mouse.move(t.x - 6, t.y + t.height / 2, { steps: 30 });
  await page.waitForTimeout(250);
  await page.mouse.move(t.x + 20, t.y + t.height / 2, { steps: 6 });
  await page.waitForTimeout(250);
  await page.mouse.up();
  await page.waitForTimeout(1500);
  const aria = await ariaOf();
  console.log("--- after", attempt, "---");
  console.log(aria);
}

// Clean up the spawned 3D node.
const t2 = await tgt.boundingBox();
if (t2) {
  await page.mouse.click(t2.x + t2.width * 0.4, t2.y + 6);
  await page.waitForTimeout(500);
  await page.keyboard.press("Backspace");
  await page.waitForTimeout(700);
}
console.log("final count:", (await ids()).length, "orig:", before.length);
await browser.close();
