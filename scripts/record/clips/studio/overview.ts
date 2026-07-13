import type { Clip } from "../../lib/runner.ts";
import { aibar, clipNodes, insp, studioReady, studioUrl } from "./_helpers.ts";

/**
 * studio/overview.mdx — a slow tour of the populated Studio: preview player,
 * timeline, inspector and AI sidebar, plus the Canvas/Studio header toggle.
 */
const clip: Clip = {
  name: "studio/overview",
  url: studioUrl(),
  crf: 26,
  actions: async ({ page, h }) => {
    await studioReady(page);
    await clipNodes(page).first().waitFor({ state: "visible", timeout: 30_000 });
    // Seek the playhead a little so the preview composites the scene (not black).
    await page.getByRole("button", { name: "Timeline ruler — click to seek" }).click({ position: { x: 60, y: 8 } }).catch(() => {});
    await page.waitForTimeout(700);
    await h.beat(600);
    h.mark();

    // Inspector — the Nodes list of every clip in the scene.
    await h.moveTo(clipNodes(page).nth(0));
    await h.beat(500);
    await h.moveTo(clipNodes(page).nth(1));
    await h.beat(450);
    await h.moveTo(clipNodes(page).nth(2));
    await h.beat(700);

    // The Canvas / Studio header toggle.
    await h.moveTo(page.getByRole("tab", { name: "Canvas" }));
    await h.beat(500);
    await h.moveTo(page.getByRole("tab", { name: "Studio" }));
    await h.beat(700);

    // Preview player at the top of the workspace.
    await h.moveTo(page.getByRole("button", { name: "Play video" }));
    await h.beat(900);

    // AI assistant sidebar and its quick actions.
    await h.moveTo(aibar(page).getByRole("button", { name: "Build a rough cut" }));
    await h.beat(500);
    await h.moveTo(aibar(page).getByRole("button", { name: "Generate a video clip" }));
    await h.beat(700);

    // Timeline — tracks and clips below the player.
    await h.moveTo(page.getByRole("button", { name: /Timeline clip/ }).first());
    await h.beat(600);
    await h.moveTo(page.getByRole("button", { name: "Split at playhead" }));
    await h.beat(400);
    await h.moveTo(page.getByRole("button", { name: "Zoom in" }));
    await h.beat(500);

    // Settle back on the inspector.
    await h.moveTo(insp(page).getByRole("button", { name: "Properties" }));
    await h.beat(700);
    await h.moveTo({ x: 600, y: 330 });
    await h.beat(900);
  },
};

export default clip;
