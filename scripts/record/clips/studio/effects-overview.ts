import type { Clip } from "../../lib/runner.ts";
import {
  addEffect, clearEffects, insp, scrubLabel, selectClip, studioReady, studioUrl, subTab, widenInspector,
} from "./_helpers.ts";

/**
 * studio/effects/overview.mdx — add a Vignette from the Effects rack, dial it in,
 * toggle it off/on to compare, then stack a second effect on top.
 */
const clip: Clip = {
  name: "studio/effects-overview",
  url: studioUrl(),
  actions: async ({ page, h }) => {
    await studioReady(page);
    await widenInspector(page, 120);
    const i = insp(page);
    // Setup (trimmed): select a clip, open Effects, start from an empty rack.
    await selectClip(page, 0);
    await clearEffects(page);
    await subTab(page, "Effects");
    await h.beat(500);
    h.mark();

    // Pick Vignette from the dropdown and add it.
    await h.click(i.locator("select").first());
    await h.beat(300);
    await addEffect(page, "Vignette");
    await h.beat(600);

    // Dial the vignette up so it reads in the preview.
    await scrubLabel(page, h, "Amount", 70);
    await h.beat(700);

    // Toggle it off, then back on, to compare.
    await h.click(i.getByRole("button", { name: /^On$/ }));
    await h.beat(800);
    await h.click(i.getByRole("button", { name: /^Off$/ }));
    await h.beat(800);

    // Stack a second effect on top — the rack now shows two cards.
    await h.click(i.locator("select").first());
    await h.beat(300);
    await addEffect(page, "Sharpen");
    await h.beat(1100);
  },
};

export default clip;
