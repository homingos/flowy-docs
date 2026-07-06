import type { Clip } from "../../lib/runner.ts";
import {
  addEffect, clearEffects, insp, scrubValue, selectClip, studioReady, studioUrl, subTab,
} from "./_helpers.ts";

/**
 * studio/effects/stylize.mdx — soften with Blur (Transform), then add a Vignette
 * (amount + feather) and a Crop to reframe the shot.
 */
const clip: Clip = {
  name: "studio/effects-stylize",
  url: studioUrl(),
  actions: async ({ page, h }) => {
    await studioReady(page);
    // Setup (trimmed): pick a clip, clear its rack.
    await selectClip(page, 2);
    await clearEffects(page);
    await subTab(page, "Effects");
    await h.beat(500);
    h.mark();

    // Vignette from the Effects rack: dial amount, tighten the feather.
    await h.click(insp(page).locator("select").first());
    await h.beat(300);
    await addEffect(page, "Vignette");
    await h.beat(400);
    await scrubValue(page, h, "Amount", 65);
    await h.beat(600);
    await scrubValue(page, h, "Feather", -35);
    await h.beat(800);

    // Crop to reframe the edges.
    await h.click(insp(page).locator("select").first());
    await h.beat(300);
    await addEffect(page, "Crop");
    await h.beat(400);
    await scrubValue(page, h, "Left", 40);
    await h.beat(1100);
  },
};

export default clip;
