import type { Clip } from "../../lib/runner.ts";
import {
  insp, openPexels, ruler, seekAt, studioReady, studioUrl, subTab, timelineClips, widenInspector,
} from "./_helpers.ts";

// Dedicated walkthrough project (clean scene) so ops stay legible.
const WALK = "6a4b777a514413fa84caca3d";

/**
 * studio/timeline.mdx (walkthrough) — add stock clips to the timeline, reorder,
 * trim a clip edge, split at the playhead (⌘K), add a keyframe, and scrub.
 */
const clip: Clip = {
  name: "studio/timeline",
  url: studioUrl(WALK),
  size: [1920, 1080],
  actions: async ({ page, h }) => {
    await studioReady(page);
    await widenInspector(page, 140);
    await timelineClips(page).first().waitFor({ state: "visible", timeout: 30_000 });
    await h.beat(600);
    h.mark();

    // 1) Bring in a stock clip from the Pexels plugin.
    await openPexels(page);
    const box = insp(page).getByRole("textbox", { name: "Search stock media…" });
    await h.click(box);
    await page.keyboard.type("waterfall", { delay: 30 });
    await page.keyboard.press("Enter");
    await h.skip(async () => { await page.waitForTimeout(6000); });
    await insp(page).locator("img").nth(0).dblclick();
    await page.waitForTimeout(1600);
    await h.beat(700);

    const bar = () => timelineClips(page).first();

    // 2) Reorder — nudge a clip along its track.
    let b = await bar().boundingBox();
    if (b) {
      const cy = b.y + b.height / 2;
      await h.drag({ x: b.x + b.width / 2, y: cy }, { x: b.x + b.width / 2 + 110, y: cy });
    }
    await h.beat(700);

    // 3) Trim — drag a clip's right edge inward a little.
    b = await bar().boundingBox();
    if (b) {
      const cy = b.y + b.height / 2;
      await h.drag({ x: b.x + b.width - 3, y: cy }, { x: b.x + b.width - 45, y: cy });
    }
    await h.beat(700);

    // 4) Split at the playhead — seek into the clip, select it, press ⌘K.
    b = await bar().boundingBox();
    if (b) {
      const cy = b.y + b.height / 2;
      await seekAt(page, h, b.x + b.width / 2);
      await h.beat(300);
      await h.click({ x: b.x + b.width / 2, y: cy });
      await h.beat(300);
      await page.keyboard.press("Meta+k");
    }
    await h.beat(800);

    // 5) Add a keyframe on a property — reselect the (left) split clip using the
    // last known box (timeline bars lose their a11y name right after a split).
    if (b) await h.click({ x: b.x + 34, y: b.y + b.height / 2 });
    await h.beat(400);
    await subTab(page, "Transform");
    await h.beat(400);
    await h.click(insp(page).getByRole("button", { name: "Add keyframe" }).first());
    await h.beat(800);

    // 6) Scrub the playhead across the clips (stay within the content).
    const rb = await ruler(page).boundingBox();
    if (rb) {
      for (const dx of [24, 60, 96, 132, 168, 96, 48]) {
        await seekAt(page, h, rb.x + dx);
        await h.beat(240);
      }
    }
    await h.beat(1000);
  },
};

export default clip;
