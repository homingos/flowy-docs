import type { Clip } from "../../lib/runner.ts";
import { insp, selectClip, studioReady, studioUrl, widenInspector } from "./_helpers.ts";

/**
 * studio/inspector.mdx — the inspector's four tabs (Nodes / Media / Properties /
 * Plugins), then a selected clip's Properties sub-tabs (Transform, Color,
 * Compositing).
 */
const clip: Clip = {
  name: "studio/inspector",
  url: studioUrl(),
  actions: async ({ page, h }) => {
    await studioReady(page);
    await widenInspector(page, 120);
    const i = insp(page);
    await h.beat(500);
    h.mark();

    // The four inspector tabs along the icon strip.
    await h.click(i.getByRole("button", { name: "Media" }));
    await h.beat(800);
    await h.click(i.getByRole("button", { name: "Plugins" }));
    await h.beat(800);
    await h.click(i.getByRole("button", { name: "Nodes" }));
    await h.beat(600);

    // Select a clip → Properties opens with its controls.
    await selectClip(page, 0);
    await h.beat(700);

    // Walk the Properties sub-tabs.
    await h.click(i.getByRole("button", { name: /^Transform$/ }));
    await h.beat(900);
    await h.click(i.getByRole("button", { name: /^Color$/ }));
    await h.beat(900);
    await h.click(i.getByRole("button", { name: /^Compositing$/ }));
    await h.beat(900);
    await h.click(i.getByRole("button", { name: /^Effects$/ }));
    await h.beat(800);

    // Back to Transform to end on the transform controls.
    await h.click(i.getByRole("button", { name: /^Transform$/ }));
    await h.beat(1000);
  },
};

export default clip;
