/**
 * Probe (excluded from run.ts): list image-node thumbnails on masai maara and
 * download a few candidates to pick first/last frames from.
 */
import { writeFileSync } from "node:fs";
import { chromium } from "playwright";
import { STATE_PATH } from "../lib/auth.ts";
import { BASE_URL as BASE } from "../lib/env.ts";

const SCRATCH = process.env.SCRATCH ?? "/tmp";
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
const imgs = await page.evaluate(`(() => {
  const out = [];
  for (const n of Array.from(document.querySelectorAll(".react-flow__node"))) {
    const id = n.getAttribute("data-id") || "";
    if (!id.startsWith("image_")) continue;
    const img = n.querySelector("img");
    if (!img || !img.src) continue;
    out.push({ id, src: img.src, w: img.naturalWidth, h: img.naturalHeight });
  }
  return out;
})()`);
const list = imgs as Array<{ id: string; src: string; w: number; h: number }>;
console.log(`found ${list.length} image nodes with content`);
// The canvas inlines images as data: URIs — decode the big ones directly.
const real = list.filter((i) => i.src.startsWith("data:") && i.src.length > 50_000);
console.log(`data-URI images over 50KB: ${real.length}`);
for (let i = 0; i < Math.min(8, real.length); i++) {
  const item = real[i];
  const b64 = item.src.split(",")[1] ?? "";
  writeFileSync(`${SCRATCH}/cand-${i}-${item.id.slice(6, 12)}.jpg`, Buffer.from(b64, "base64"));
  console.log(`cand-${i}: ${item.id} srcLen=${item.src.length}`);
}
await browser.close();
