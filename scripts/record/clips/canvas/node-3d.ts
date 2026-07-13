import type { Clip } from "../../lib/runner.ts";

// "Midnight Meadow" — the assistant pre-wired 'Mug Model' from the Hero Shot.
// The dev build's 3D viewer renders black, so the clip stays on the node +
// settings panel: engine, quality, material, format, and the wired reference.
const PROJECT = "6a4b7988514413fa84caca94";
const NODE_ID = "3d_435cbd280ec0408c98305b2dca6ab61a";

const clip: Clip = {
  name: "canvas/node-3d",
  url: `/editor/${PROJECT}/canvas`,
  crf: 24,
  actions: async ({ page, h }) => {
    await page.getByRole("button", { name: "Skip for now" }).click({ timeout: 4000 }).catch(() => {});
    await page.locator(".react-flow__node").first().waitFor({ state: "visible", timeout: 30_000 });
    await h.beat(800);
    const node = page.locator(`.react-flow__node[data-id="${NODE_ID}"]`);
    let box = await node.boundingBox();
    if (!box) {
      await page.keyboard.press("Shift+Digit1");
      await h.beat(800);
      box = await node.boundingBox();
    }
    if (!box) throw new Error("Mug Model node not found");
    await page.mouse.click(box.x + box.width * 0.4, box.y + 6);
    await page.waitForTimeout(500);
    await page.keyboard.press("Shift+Digit2");
    await h.beat(900);
    h.mark();

    // Select — engine and material settings open on the right.
    box = await node.boundingBox();
    if (!box) throw new Error("node left view");
    await h.click({ x: box.x + box.width * 0.4, y: box.y + 8 });
    await h.beat(1400);

    // Glance across the generation settings.
    for (const name of ["Engine", "Quality", "Material", "Format"]) {
      const combo = page.getByRole("combobox", { name });
      if (await combo.isVisible().catch(() => false)) {
        await h.moveTo(combo);
        await h.beat(700);
      }
    }

    // The wired reference image shows up under Image views.
    const refLabel = page.getByText("#1", { exact: true }).first();
    if (await refLabel.isVisible().catch(() => false)) {
      const rb = await refLabel.boundingBox();
      if (rb) {
        // Hover the thumbnail just above the "#1" label.
        await h.moveTo({ x: rb.x + rb.width / 2, y: rb.y - 22 });
        await h.beat(1400);
      }
    }

    // Cost estimate at the bottom of the panel.
    const cost = page.getByText(/credits/).last();
    if (await cost.isVisible().catch(() => false)) {
      await h.moveTo(cost);
      await h.beat(1100);
    }

    // Rest on the configured node.
    box = await node.boundingBox();
    if (box) await h.moveTo({ x: box.x + box.width / 2, y: box.y + box.height * 0.45 });
    await h.beat(2400);
  },
};

export default clip;
