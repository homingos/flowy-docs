import type { Clip } from "../../lib/runner.ts";
import {
  addEffect, clearEffects, insp, scrubValue, selectClip, studioReady, studioUrl, subTab,
} from "./_helpers.ts";

/**
 * studio/effects/color-correction.mdx — balance a clip on the Color tab
 * (Exposure, Contrast, Saturation), then warm it with the Temperature grade
 * effect from the rack.
 */
const clip: Clip = {
  name: "studio/effects-color",
  url: studioUrl(),
  actions: async ({ page, h }) => {
    await studioReady(page);
    // Setup (trimmed): pick a clip, clear its rack.
    await selectClip(page, 1);
    await clearEffects(page);
    await subTab(page, "Color");
    await h.beat(500);
    h.mark();

    // Primary corrections on the Color tab.
    await scrubValue(page, h, "Exposure", 55);
    await h.beat(700);
    await scrubValue(page, h, "Contrast", 45);
    await h.beat(700);
    await scrubValue(page, h, "Saturation", 45);
    await h.beat(800);

    // Warm it up with the Temperature grade effect.
    await subTab(page, "Effects");
    await h.beat(400);
    await h.click(insp(page).locator("select").first());
    await h.beat(300);
    await addEffect(page, "Temperature");
    await h.beat(500);
    await scrubValue(page, h, "Warm/Cool", 70);
    await h.beat(1100);
  },
};

export default clip;
