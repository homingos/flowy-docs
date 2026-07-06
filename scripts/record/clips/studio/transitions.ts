import type { Clip } from "../../lib/runner.ts";
import { studioReady, studioUrl, timelineClips } from "./_helpers.ts";

/**
 * studio/effects/transitions.mdx — transitions live at the cut between two
 * adjacent clips on one track. This clip lines two clips up end-to-end on a
 * single track and scrubs the playhead slowly across the cut between them.
 *
 * NB: this build ships the transition engine (Cross Dissolve, dips, wipes) but
 * exposes no timeline control to *add* one, so the footage shows the cut the
 * transition would ride rather than an applied dissolve. See handoff notes.
 */
const clip: Clip = {
  name: "studio/transitions",
  url: studioUrl(),
  actions: async ({ page, h }) => {
    await studioReady(page);
    const bars = timelineClips(page);
    await bars.first().waitFor({ state: "visible", timeout: 20_000 });

    // Setup (trimmed): drag the 2nd track's clip up onto track 1, right after
    // the first clip, so the two sit end-to-end on one track.
    await page.mouse.move(245, 716, { steps: 6 });
    await page.mouse.down();
    await page.mouse.move(300, 690, { steps: 18 });
    await page.mouse.move(338, 661, { steps: 24 });
    await page.mouse.move(340, 661, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(1500);

    // Find the cut = right edge of the first clip on track 1.
    const b0 = await bars.first().boundingBox();
    const cut = b0 ? Math.round(b0.x + b0.width) : 291;
    const rulerY = 619;
    await h.beat(600);
    h.mark();

    // Two clips meeting at a single cut on one track.
    await h.moveTo({ x: cut - 40, y: 661 });
    await h.beat(500);
    await h.moveTo({ x: cut + 40, y: 661 });
    await h.beat(600);

    // Scrub the playhead slowly across the cut — the boundary a transition rides.
    for (const x of [cut - 55, cut - 30, cut - 12, cut, cut + 12, cut + 30, cut + 55]) {
      await h.click({ x, y: rulerY });
      await h.beat(450);
    }
    await h.beat(900);
  },
};

export default clip;
