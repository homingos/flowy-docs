/**
 * Probe (excluded from run.ts): console + network errors while opening the
 * 3D viewer, plus the full img src inside the node.
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
const errs: string[] = [];
page.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warning") errs.push(`[${m.type()}] ${m.text().slice(0, 200)}`);
});
page.on("requestfailed", (r) => errs.push(`[reqfail] ${r.url().slice(0, 160)} :: ${r.failure()?.errorText}`));
page.on("response", (r) => {
  if (r.status() >= 400) errs.push(`[${r.status()}] ${r.url().slice(0, 160)}`);
});
await page.goto(`${BASE}/editor/6a4b7988514413fa84caca94/canvas`, { waitUntil: "domcontentloaded" });
await page.waitForLoadState("networkidle").catch(() => {});
await page.waitForTimeout(5000);
await page.getByRole("button", { name: "Skip for now" }).click({ force: true, timeout: 3000 }).catch(() => {});
const NODE_ID = "3d_435cbd280ec0408c98305b2dca6ab61a";
const node = page.locator(`.react-flow__node[data-id="${NODE_ID}"]`);
let b = await node.boundingBox();
if (!b) {
  await page.keyboard.press("Shift+Digit1");
  await page.waitForTimeout(800);
  b = await node.boundingBox();
}
if (!b) throw new Error("no node");
console.log("full img src:", await node.locator("img").first().getAttribute("src").catch(() => null));
errs.length = 0; // only care about viewer-open errors
const view = node.getByText("View in 3D").first();
await view.click({ force: true });
await page.waitForTimeout(20_000);
console.log("node text:", ((await node.textContent()) ?? "").slice(0, 120));
console.log("--- errors after View in 3D ---");
for (const e of errs.slice(0, 30)) console.log(e);
// Any glb/gltf requests at all?
await browser.close();
