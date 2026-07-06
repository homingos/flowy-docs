import type { Locator, Page } from "playwright";

export interface Helpers {
  /** Pause between beats. Default 450ms. */
  beat: (ms?: number) => Promise<void>;
  /** Smooth cursor travel to a locator (or x/y), no click. */
  moveTo: (target: Locator | { x: number; y: number }, steps?: number) => Promise<void>;
  /** moveTo + settle + click, with visible ripple. */
  click: (target: Locator | { x: number; y: number }) => Promise<void>;
  /** Click then type with human cadence. */
  type: (target: Locator, text: string, delayMs?: number) => Promise<void>;
  /** Smooth wheel scroll at the current cursor position. */
  scroll: (dy: number, stepPx?: number) => Promise<void>;
  /** Drag from one point/locator to another. */
  drag: (
    from: Locator | { x: number; y: number },
    to: Locator | { x: number; y: number },
  ) => Promise<void>;
  /**
   * Wrap a long wait (generation, render). The wall-clock span is written to
   * the clip's segment log and jump-cut in post: ~1.5s of the loading state is
   * kept, then we cut straight to the reveal.
   */
  skip: <T>(fn: () => Promise<T>) => Promise<T>;
  /** Everything before the last mark() is trimmed from the final clip. */
  mark: () => void;
}

export interface SegmentLog {
  t0: number;
  contentStart: number; // seconds offset from t0
  skips: Array<{ start: number; end: number }>; // seconds offsets from t0
}

async function resolvePoint(
  page: Page,
  target: Locator | { x: number; y: number },
): Promise<{ x: number; y: number }> {
  if ("x" in target && typeof target.x === "number") {
    return target as { x: number; y: number };
  }
  const loc = target as Locator;
  await loc.waitFor({ state: "visible", timeout: 15_000 });
  const box = await loc.boundingBox();
  if (!box) throw new Error("Target has no bounding box");
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

export function makeHelpers(page: Page, log: SegmentLog): Helpers {
  const now = () => (Date.now() - log.t0) / 1000;

  const beat = async (ms = 450) => {
    await page.waitForTimeout(ms);
  };

  const moveTo = async (
    target: Locator | { x: number; y: number },
    steps = 32,
  ) => {
    const { x, y } = await resolvePoint(page, target);
    await page.mouse.move(x, y, { steps });
  };

  const click = async (target: Locator | { x: number; y: number }) => {
    await moveTo(target);
    await beat(280);
    await page.mouse.down();
    await page.waitForTimeout(90);
    await page.mouse.up();
    await beat(320);
  };

  const type = async (target: Locator, text: string, delayMs = 45) => {
    await click(target);
    await page.keyboard.type(text, { delay: delayMs });
    await beat(300);
  };

  const scroll = async (dy: number, stepPx = 120) => {
    const steps = Math.max(1, Math.round(Math.abs(dy) / stepPx));
    const per = dy / steps;
    for (let i = 0; i < steps; i++) {
      await page.mouse.wheel(0, per);
      await page.waitForTimeout(40);
    }
    await beat(250);
  };

  const drag = async (
    from: Locator | { x: number; y: number },
    to: Locator | { x: number; y: number },
  ) => {
    const a = await resolvePoint(page, from);
    await page.mouse.move(a.x, a.y, { steps: 24 });
    await beat(250);
    await page.mouse.down();
    await page.waitForTimeout(120);
    const b = await resolvePoint(page, to);
    await page.mouse.move(b.x, b.y, { steps: 40 });
    await page.waitForTimeout(120);
    await page.mouse.up();
    await beat(300);
  };

  const skip = async <T,>(fn: () => Promise<T>): Promise<T> => {
    const start = now();
    try {
      return await fn();
    } finally {
      log.skips.push({ start, end: now() });
    }
  };

  const mark = () => {
    log.contentStart = now();
  };

  return { beat, moveTo, click, type, scroll, drag, skip, mark };
}
