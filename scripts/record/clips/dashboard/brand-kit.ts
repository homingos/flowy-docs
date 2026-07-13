import type { Clip } from "../../lib/runner.ts";

/**
 * dashboard/brand-kit.mdx — "build a brand kit and apply it on the canvas."
 *
 * Extract a kit from a website URL on the Brand Kit page (background processing
 * jump-cut), review the captured logo / fonts / colors, then hop into a canvas,
 * add a Brand Kit node and attach the kit. Recorded at 1280×800 — the canvas
 * segment mis-renders at a 1920-wide headed viewport.
 *
 * Take notes (learned the hard way):
 * - Re-extracting a domain that already exists in the workspace throws an
 *   error toast: figma.com, linear.app, notion.so, stripe.com, vercel.com are
 *   burned. Each retake needs a NEVER-extracted domain.
 * - The canvas kit picker hides kits whose status is "processing"
 *   (BrandKitNode.tsx filters them), the nle store fetches the list ONCE per
 *   page load, and post-extraction processing can lag minutes. So: poll the
 *   getall API (bearer from /api/auth/session) until status === "success"
 *   BEFORE navigating to the canvas.
 * - Failed takes left stray empty Brand Kit nodes on Wandering Sparrow at the
 *   default spawn point; deleting them was denied, so pan to empty space
 *   off-camera and end on zoom-to-selection, never Shift+1 zoom-to-fit.
 */
const CANVAS_PROJECT = "6a4b79b9514413fa84caca9f";
const WORKSPACE = "6a4ad8079a876dea0d2d111a";
const DOMAIN = "github.com";
const KIT_NAME = /GitHub/i;
const SEARCH_QUERY = "git";

const clip: Clip = {
  name: "dashboard/brand-kit",
  url: "/dashboard/brandkit",
  crf: 26,
  speed: 1.25,
  actions: async ({ page, h, baseUrl }) => {
    await page.getByRole("heading", { name: "Extract a brand kit" }).waitFor({ state: "visible", timeout: 15_000 });
    await page.getByRole("button", { name: "Dismiss promo" }).click({ timeout: 1500 }).catch(() => {});
    // Off-camera: delete any leftover kit for this take's domain — extracting
    // a domain that already exists throws an error toast. (The kit is a
    // prior-take artifact, never attached to a canvas node.)
    const stale = page.getByText(DOMAIN, { exact: true }).first();
    if (await stale.isVisible().catch(() => false)) {
      await stale.hover();
      await page.waitForTimeout(600);
      await page.getByRole("button", { name: "Delete" }).first().click({ timeout: 4000 });
      await page.getByRole("button", { name: /Delete|Confirm|Yes/ }).last().click({ timeout: 4000 }).catch(() => {});
      await stale.waitFor({ state: "hidden", timeout: 15_000 });
      await page.mouse.move(640, 700, { steps: 4 });
      await page.waitForTimeout(1000);
    }
    await h.beat(500);
    h.mark();

    // Paste a brand URL and extract.
    const urlBox = page.getByRole("textbox", { name: "example.com" });
    await h.click(urlBox);
    await page.keyboard.type(DOMAIN, { delay: 55 });
    await h.beat(500);
    await h.click(page.getByRole("button", { name: "Extract" }));
    await h.beat(600);
    // Extraction runs in the background — jump-cut until the kit has fully
    // PROCESSED (status success), not merely appeared: the canvas kit picker
    // filters out "processing" kits and never refetches within a page load.
    await h.skip(async () => {
      await page.keyboard.press("Escape").catch(() => {});
      const kitStatus = () =>
        page.evaluate(
          async ({ ws, domain }) => {
            try {
              const sess = await (await fetch("/api/auth/session")).json();
              const token = sess?.accessToken;
              const res = await fetch(
                `/api/brand-kit/getall?workspace_id=${encodeURIComponent(ws)}&view=summary`,
                { headers: token ? { Authorization: `Bearer ${token}` } : {} },
              );
              const json = await res.json();
              const list = (json?.data?.brandkits ?? []) as Array<{ domain?: string; status?: string }>;
              return list.find((k) => k.domain === domain)?.status ?? "absent";
            } catch {
              return "error";
            }
          },
          { ws: WORKSPACE, domain: DOMAIN },
        );
      let status = "absent";
      for (let i = 0; i < 60; i++) {
        status = await kitStatus();
        if (status === "success" || status === "failed") break;
        await page.waitForTimeout(10_000);
      }
      if (status !== "success") throw new Error(`brand kit extraction ended in status: ${status}`);
      await page.getByText(DOMAIN, { exact: true }).first().waitFor({ state: "visible", timeout: 30_000 });
      await page.waitForTimeout(1500);
    });
    await h.beat(600);

    // Rest ABOVE the captured kit — hovering any card (including neighbours)
    // covers its swatches with a View/Delete overlay.
    const card = page.getByText(DOMAIN, { exact: true }).first();
    const cb = await card.boundingBox();
    if (cb) {
      await h.moveTo({ x: cb.x + 40, y: Math.max(40, cb.y - 200) });
      await h.beat(1600);
    }

    // Over to a canvas to put the kit to work.
    await h.skip(async () => {
      // The runner keeps the first 1.5s of every skip (KEEP_LOADING) — pad
      // before navigating so that kept stretch shows the dashboard, not the
      // blank page of a mid-goto document swap.
      await page.waitForTimeout(2600);
      await page.goto(`${baseUrl}/editor/${CANVAS_PROJECT}/canvas`, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.getByRole("button", { name: "Skip for now" }).click({ timeout: 8000 }).catch(() => {});
      await page.getByRole("button", { name: "Add a node" }).waitFor({ state: "visible", timeout: 30_000 });
      // Hold the cut until the canvas has actually painted — cutting on
      // "Add a node" alone leaks ~0.7s of black into the footage.
      await page.locator(".react-flow__node").first().waitFor({ state: "visible", timeout: 30_000 }).catch(() => {});
      await page.waitForTimeout(2000);
      // Pan to empty space so the stray Brand Kit nodes (failed-take leftovers
      // at the default spawn point) stay out of the viewport.
      await page.getByRole("button", { name: "Pan" }).click({ force: true });
      await page.waitForTimeout(300);
      for (let i = 0; i < 3; i++) {
        const strays = await page.evaluate(() => {
          let n = 0;
          for (const el of Array.from(document.querySelectorAll('[data-testid^="rf__node-brandkit"]'))) {
            const r = el.getBoundingClientRect();
            if (r.right > -100 && r.left < 1380 && r.bottom > -100 && r.top < 900) n++;
          }
          return n;
        });
        if (strays === 0) break;
        await page.mouse.move(700, 400);
        await page.mouse.down();
        await page.mouse.move(120, 400, { steps: 20 });
        await page.mouse.up();
        await page.waitForTimeout(500);
      }
      await page.getByRole("button", { name: "Select" }).click({ force: true });
      await page.waitForTimeout(600);
      // Zoom in so the kit picker's rows are big enough to click reliably —
      // at 52% the row hit targets are ~10px and clicks miss.
      for (let i = 0; i < 20; i++) {
        const label = await page
          .getByRole("button", { name: /^Zoom level/ })
          .getAttribute("aria-label")
          .catch(() => null);
        const pct = Number(/(\d+)%/.exec(label ?? "")?.[1] ?? 0);
        if (pct >= 110) break;
        await page.mouse.move(640, 400);
        await page.keyboard.down("Meta");
        await page.mouse.wheel(0, -120);
        await page.keyboard.up("Meta");
        await page.waitForTimeout(300);
      }
      await page.waitForTimeout(600);
    });
    await page.mouse.move(640, 400, { steps: 4 });
    await h.beat(500);

    // Add a Brand Kit node. IMPORTANT: the stray nodes from failed takes sit
    // off-screen with their pickers still open — scope every picker locator
    // to the NEWEST node or `.first()` resolves to a stray's picker.
    await h.click(page.getByRole("button", { name: "Add a node" }));
    await h.beat(400);
    await h.click(page.locator('[aria-label="Node selection"]').getByRole("button", { name: /^Brand Kit/ }));
    const newNode = page.locator('[data-testid^="rf__node-brandkit"]').last();
    const search = newNode.getByRole("textbox", { name: /Search kits/ }).first();
    await search.waitFor({ state: "visible", timeout: 8000 });
    await h.beat(700);

    // Search for the kit and attach it.
    await h.click(search);
    await page.keyboard.type(SEARCH_QUERY, { delay: 70 });
    await h.beat(800);
    // The status gate before the canvas goto guarantees the kit is in this
    // page load's list — if it's not visible now, something else broke.
    const kitResult = newNode.getByRole("button", { name: KIT_NAME }).first();
    await kitResult.waitFor({ state: "visible", timeout: 15_000 });
    await h.click(kitResult);
    // The picker closes once the kit actually attaches — a silent miss here
    // produced a take that ended on an open picker.
    try {
      await search.waitFor({ state: "hidden", timeout: 8_000 });
    } catch {
      await h.click(kitResult);
      await search.waitFor({ state: "hidden", timeout: 8_000 });
    }
    await h.beat(700);
    // Let the attached kit's thumbnail finish loading before we rest on it.
    await page
      .getByText("Loading GitHub", { exact: false })
      .first()
      .waitFor({ state: "hidden", timeout: 20_000 })
      .catch(() => {});
    await h.beat(600);

    // Frame the finished node — zoom to SELECTION, never zoom-to-fit (that
    // would pull the off-screen stray nodes into view).
    const applied = page.locator('[data-testid^="rf__node-brandkit"]').last();
    const ab = await applied.boundingBox();
    if (ab) {
      await page.mouse.click(ab.x + ab.width / 2, ab.y + 4);
      await page.waitForTimeout(400);
      await page.keyboard.press("Shift+Digit2");
      await h.beat(900);
      const zb = await applied.boundingBox();
      if (zb) await h.moveTo({ x: zb.x + zb.width / 2, y: zb.y + zb.height / 2 });
      await h.beat(1800);
    } else {
      await h.beat(1400);
    }
  },
};

export default clip;
