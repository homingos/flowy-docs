import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, renameSync, rmSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { type Browser, type BrowserContext, type Page, chromium } from "playwright";

import { STATE_PATH } from "./auth.ts";
import { CURSOR_INIT_SCRIPT } from "./cursor.ts";
import { BASE_URL } from "./env.ts";
import { type Helpers, type SegmentLog, makeHelpers } from "./human.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const RECORD_ROOT = join(HERE, "..");
const DOCS_ROOT = join(RECORD_ROOT, "..", "..");
const RAW_DIR = join(RECORD_ROOT, "raw");
const VIDEOS_DIR = join(DOCS_ROOT, "videos");
const POSTERS_DIR = join(DOCS_ROOT, "images", "posters");

export interface ClipContext {
  page: Page;
  h: Helpers;
  context: BrowserContext;
  browser: Browser;
  baseUrl: string;
}

export interface Clip {
  /** Output path relative to /videos, no extension — e.g. "canvas/node-text". */
  name: string;
  /** CSS-pixel viewport & video size. Loops: [1280,800]. Walkthroughs: [1920,1080]. */
  size?: [number, number];
  /** Page to open before actions run. */
  url: string;
  /** Poster timestamp in seconds within the FINAL clip. Default 1.0. */
  posterAt?: number;
  /** Playback speed multiplier applied in post (2 = twice as fast). */
  speed?: number;
  /** Constant-rate factor for x264. Default 24. */
  crf?: number;
  actions: (ctx: ClipContext) => Promise<void>;
}

function ffmpeg(args: string[]) {
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], {
    stdio: ["ignore", "inherit", "inherit"],
  });
}

/** Build the ffmpeg keep-filter from the segment log. */
function buildFilters(log: SegmentLog, speed?: number): string[] {
  const KEEP_LOADING = 1.5; // seconds of each wait to keep
  const cuts = log.skips
    .map(({ start, end }) => ({ from: start + KEEP_LOADING, to: end - 0.4 }))
    .filter((c) => c.to > c.from + 0.2);

  const vf: string[] = [];
  if (log.contentStart > 0.05 || cuts.length > 0) {
    // keep = [contentStart..∞) minus cut ranges
    let expr = `gte(t,${log.contentStart.toFixed(2)})`;
    for (const c of cuts) {
      expr += `*(1-between(t,${c.from.toFixed(2)},${c.to.toFixed(2)}))`;
    }
    vf.push(`select='${expr}'`, "setpts=N/FRAME_RATE/TB");
  }
  if (speed && speed !== 1) {
    vf.push(`setpts=${(1 / speed).toFixed(4)}*PTS`);
  }
  return vf;
}

export async function recordClip(clip: Clip): Promise<void> {
  const [w, hgt] = clip.size ?? [1280, 800];
  mkdirSync(RAW_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless: false,
    args: ["--disable-infobars", "--no-default-browser-check"],
  });
  const context = await browser.newContext({
    viewport: { width: w, height: hgt },
    storageState: existsSync(STATE_PATH) ? STATE_PATH : undefined,
    recordVideo: { dir: RAW_DIR, size: { width: w, height: hgt } },
    colorScheme: "dark",
  });
  await context.addInitScript(CURSOR_INIT_SCRIPT);

  const log: SegmentLog = { t0: 0, contentStart: 0, skips: [] };
  const page = await context.newPage();
  log.t0 = Date.now();
  const h = makeHelpers(page, log);

  console.log(`▶ ${clip.name} (${w}x${hgt})`);
  let failed: unknown = null;
  try {
    await page.goto(`${BASE_URL}${clip.url}`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});
    // dismiss the notifications opt-in toast if it pops
    await page
      .getByRole("button", { name: "Not now" })
      .click({ timeout: 1500 })
      .catch(() => {});
    // park the cursor somewhere sane, wait for paint to settle, then mark
    await page.mouse.move(w / 2, hgt / 2, { steps: 2 });
    await h.beat(900);
    h.mark();
    await clip.actions({ page, h, context, browser, baseUrl: BASE_URL });
    await h.beat(700); // tail
  } catch (err) {
    failed = err;
  }

  const video = page.video();
  await context.close(); // flushes the webm
  await browser.close();

  if (failed) {
    console.error(`✖ ${clip.name} failed:`, failed);
    if (video) rmSync(await video.path(), { force: true });
    throw failed;
  }
  if (!video) throw new Error("no video captured");

  const webmTmp = await video.path();
  const webm = join(RAW_DIR, clip.name.replace(/\//g, "__") + ".webm");
  renameSync(webmTmp, webm);

  const outMp4 = join(VIDEOS_DIR, `${clip.name}.mp4`);
  const outPoster = join(POSTERS_DIR, `${clip.name}.jpg`);
  mkdirSync(dirname(outMp4), { recursive: true });
  mkdirSync(dirname(outPoster), { recursive: true });

  const vf = buildFilters(log, clip.speed);
  ffmpeg([
    "-i", webm,
    "-an",
    ...(vf.length ? ["-vf", vf.join(",")] : []),
    "-c:v", "libx264",
    "-preset", "slow",
    "-crf", String(clip.crf ?? 24),
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    "-r", "30",
    outMp4,
  ]);
  ffmpeg(["-ss", String(clip.posterAt ?? 1.0), "-i", outMp4, "-frames:v", "1", "-q:v", "3", outPoster]);

  const mb = (statSync(outMp4).size / 1024 / 1024).toFixed(2);
  console.log(`✔ ${clip.name}.mp4 (${mb} MB) + poster`);
}
