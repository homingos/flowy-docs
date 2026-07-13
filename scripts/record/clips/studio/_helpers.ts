/**
 * Shared Studio clip helpers (excluded from run.ts by the "_" prefix).
 * Selectors verified via clips/studio/_probe.ts against a real Studio scene.
 */
import type { Locator, Page } from "playwright";
import type { Helpers } from "../../lib/human.ts";

/** The recording project — one Scene with several stock clips. */
export const STUDIO_PROJECT = "6a4b636d1263d94b3dfbdd2a";
export const studioUrl = (id = STUDIO_PROJECT) => `/editor/${id}/studio`;

export const insp = (page: Page): Locator => page.locator('aside[aria-label="Properties"]');
export const aibar = (page: Page): Locator => page.locator('aside[aria-label="AI Sidebar"]');

/** Dismiss first-run overlays and make sure a composition (Scene 1) exists. */
export async function studioReady(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Skip for now" }).click({ timeout: 2500 }).catch(() => {});
  await page.getByRole("button", { name: "Not now" }).click({ timeout: 1500 }).catch(() => {});
  const newComp = page.getByRole("button", { name: "Create new composition" });
  if (await newComp.isVisible().catch(() => false)) {
    await newComp.click();
    await page.waitForTimeout(3500);
  }
  // inspector strip should be present
  await insp(page).getByRole("button", { name: "Nodes" }).waitFor({ state: "visible", timeout: 20_000 });
}

/** Clip rows in the Nodes list. */
export const clipNodes = (page: Page): Locator =>
  insp(page).getByRole("button", { name: /Image clip|Video clip|Audio clip|Text clip/ });

/** Select a clip by its index in the Nodes list (opens Properties). */
export async function selectClip(page: Page, i = 0): Promise<void> {
  await insp(page).getByRole("button", { name: "Nodes" }).click().catch(() => {});
  await page.waitForTimeout(400);
  await clipNodes(page).nth(i).click();
  await page.waitForTimeout(900);
}

/** Open a Properties sub-tab (Transform | Color | Compositing | Effects). */
export async function subTab(page: Page, name: string): Promise<void> {
  const t = insp(page).getByRole("button", { name: new RegExp(`^${name}$`) });
  await t.scrollIntoViewIfNeeded().catch(() => {});
  await t.click();
  await page.waitForTimeout(500);
}

/** Widen the inspector so all four Properties sub-tabs fit on one row. */
export async function widenInspector(page: Page, by = 120): Promise<void> {
  const sep = page.getByRole("separator", { name: "Resize inspector" });
  const b = await sep.boundingBox().catch(() => null);
  if (!b) return;
  const cx = b.x + b.width / 2;
  const cy = b.y + b.height / 2;
  await page.mouse.move(cx, cy, { steps: 4 });
  await page.mouse.down();
  await page.mouse.move(cx + by, cy, { steps: 20 });
  await page.mouse.up();
  await page.waitForTimeout(400);
}

/** Install (if needed) and open the Pexels stock plugin; leaves search box focused-ready. */
export async function openPexels(page: Page): Promise<void> {
  const i = insp(page);
  await i.getByRole("button", { name: "Plugins" }).click().catch(() => {});
  await page.waitForTimeout(600);
  await i.getByRole("button", { name: "Pexels" }).first().click().catch(() => {});
  await page.waitForTimeout(600);
  const install = i.getByRole("button", { name: "Install plugin" });
  if (await install.isVisible().catch(() => false)) {
    await install.click();
    await page.waitForTimeout(2500);
  }
  await i.getByRole("button", { name: /^Open$/ }).click().catch(() => {});
  await page.waitForTimeout(1500);
}

/** With Pexels open, run a search and double-click the first n result tiles onto the timeline. */
export async function placeStock(page: Page, n: number, term: string): Promise<void> {
  const i = insp(page);
  const box = i.getByRole("textbox", { name: "Search stock media…" });
  await box.click();
  await box.fill("");
  await page.keyboard.type(term, { delay: 20 });
  await page.keyboard.press("Enter");
  await page.waitForTimeout(6000);
  const tiles = i.locator("img");
  for (let k = 0; k < n; k++) {
    await tiles.nth(k).dblclick();
    await page.waitForTimeout(2200);
  }
}

/** On the Effects sub-tab, remove every stacked effect card (idempotent reset). */
export async function clearEffects(page: Page): Promise<void> {
  await subTab(page, "Effects");
  const x = insp(page).getByRole("button", { name: "✕" });
  for (let guard = 0; guard < 8; guard++) {
    if (!(await x.first().isVisible().catch(() => false))) break;
    await x.first().click();
    await page.waitForTimeout(400);
  }
}

/** Add an effect from the Effects-rack dropdown. */
export async function addEffect(page: Page, label: string): Promise<void> {
  const i = insp(page);
  const combo = i.locator("select").first();
  await combo.selectOption({ label });
  await page.waitForTimeout(300);
  await i.getByRole("button", { name: /^Add$/ }).click();
  await page.waitForTimeout(900);
}

/** Bounding-box centre of a locator (for h.drag / h.click by point). */
export async function centre(loc: Locator): Promise<{ x: number; y: number }> {
  const b = await loc.boundingBox();
  if (!b) throw new Error("no bounding box");
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

/** Timeline clip bars, left-to-right. */
export const timelineClips = (page: Page): Locator =>
  page.getByRole("button", { name: /^Timeline clip/ });

export const ruler = (page: Page): Locator =>
  page.getByRole("button", { name: "Timeline ruler — click to seek" });

/** Seek by clicking the timeline ruler at viewport x (y taken from the ruler). */
export async function seekAt(page: Page, h: Helpers, x: number): Promise<void> {
  const b = await ruler(page).boundingBox();
  const y = b ? b.y + b.height / 2 : 619;
  await h.click({ x, y });
}

/**
 * Locate the drag-to-scrub value box associated with a property label, using
 * in-page geometry (works whether the value sits to the right of, or below,
 * the label). Returns the box centre in viewport pixels.
 */
export async function valueCentre(page: Page, label: string): Promise<{ x: number; y: number }> {
  const pt = await insp(page).evaluate((root, lbl) => {
    const els = Array.from(root.querySelectorAll<HTMLElement>("*"));
    // Label = smallest-area element whose trimmed text is exactly the label.
    let labelEl: HTMLElement | null = null;
    let labelArea = Infinity;
    for (const e of els) {
      if ((e.textContent || "").trim() !== lbl) continue;
      const r = e.getBoundingClientRect();
      const a = r.width * r.height;
      if (a > 0 && a < labelArea) { labelArea = a; labelEl = e; }
    }
    if (!labelEl) return null;
    const lr = labelEl.getBoundingClientRect();
    const lcx = lr.x + lr.width / 2;
    const lcy = lr.y + lr.height / 2;
    // Value box: small element carrying a number (text or input value), sitting
    // to the right of the label (same row) or directly below it.
    let best: { x: number; y: number; d: number } | null = null;
    for (const e of els) {
      let t = (e.textContent || "").trim();
      if (e instanceof HTMLInputElement) t = e.value.trim();
      if (!/^-?\d/.test(t) || t.length > 6) continue;
      const r = e.getBoundingClientRect();
      if (r.width < 24 || r.width > 220 || r.height < 12 || r.height > 36) continue;
      const cx = r.x + r.width / 2;
      const cy = r.y + r.height / 2;
      const dx = cx - lr.x;
      const dy = cy - lcy;
      const rightRow = dx > 4 && dx < 340 && Math.abs(cy - lcy) < 18;
      const below = dy > 4 && dy < 46 && Math.abs(cx - lcx) < 80;
      if (!rightRow && !below) continue;
      const d = Math.abs(dy) + Math.abs(dx) * 0.15;
      if (!best || d < best.d) best = { x: cx, y: cy, d };
    }
    return best ? { x: best.x, y: best.y } : null;
  }, label);
  if (!pt) throw new Error(`no value box for ${label}`);
  return pt;
}

/** Drag-scrub the value associated with a label by dx pixels. */
export async function scrubValue(page: Page, h: Helpers, label: string, dx: number): Promise<void> {
  const c = await valueCentre(page, label);
  await h.drag(c, { x: c.x + dx, y: c.y });
}

/** Scrub a numeric property field by dragging its value box horizontally. */
export async function scrubField(h: Helpers, field: Locator, dx: number): Promise<void> {
  const b = await field.boundingBox();
  if (!b) throw new Error("no field box");
  const from = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  await h.drag(from, { x: from.x + dx, y: from.y });
}

/**
 * Drag-to-scrub a value by its row label. Single-column rows put the value box
 * ~110px right of the label's left edge; drag horizontally to change it.
 */
export async function scrubLabel(
  page: Page,
  h: Helpers,
  label: string,
  dx: number,
  valOffsetX = 110,
): Promise<void> {
  const lab = insp(page).getByText(label, { exact: true }).first();
  const b = await lab.boundingBox();
  if (!b) throw new Error(`no label box for ${label}`);
  const from = { x: b.x + valOffsetX, y: b.y + b.height / 2 };
  await h.drag(from, { x: from.x + dx, y: from.y });
}
