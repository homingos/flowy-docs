/**
 * Probe (excluded from run.ts): what happens after "Turn on mic" — dump the
 * aria + console errors around the voice join.
 */
import { chromium } from "playwright";
import { STATE_PATH } from "../lib/auth.ts";
import { BASE_URL as BASE } from "../lib/env.ts";

const SCRATCH = process.env.SCRATCH ?? "/tmp";
const browser = await chromium.launch({
  headless: process.env.HEADED ? false : true,
  args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
});
const context = await browser.newContext({
  storageState: STATE_PATH,
  viewport: { width: 1280, height: 800 },
  colorScheme: "dark",
  permissions: ["microphone"],
});
const page = await context.newPage();
const errors: string[] = [];
page.on("console", (m) => {
  if (m.type() === "error" || /voice|livekit|room|mic|connect|disconnect|track|publish/i.test(m.text()))
    errors.push(`${m.type()}: ${m.text().slice(0, 220)}`);
});
page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 220)}`));
await page.goto(`${BASE}/editor/6a4adad69a876dea0d2d112e/canvas`, { waitUntil: "domcontentloaded" });
await page.waitForLoadState("networkidle").catch(() => {});
await page.waitForTimeout(5000);
await page.getByRole("button", { name: "Skip for now" }).click({ force: true, timeout: 3000 }).catch(() => {});
await page.getByRole("button", { name: "Collaborators" }).click({ force: true });
await page.waitForTimeout(1200);
const mic = page.getByRole("button", { name: "Turn on mic" }).first();
console.log("mic visible:", await mic.isVisible().catch(() => false));
await mic.click({ force: true });
await page.waitForTimeout(12_000);
await page.screenshot({ path: `${SCRATCH}/voice-after.png` });
const snap = await page.locator("body").ariaSnapshot();
console.log(snap.split("\n").filter((l) => /mic|voice|Leave|Mute|speaker|audio|Connect/i.test(l)).join("\n") || "no voice lines");
console.log("--- console ---");
console.log(errors.slice(-25).join("\n"));
await browser.close();
