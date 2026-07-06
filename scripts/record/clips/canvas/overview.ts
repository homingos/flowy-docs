import type { Clip } from "../../lib/runner.ts";

// Busy seeded canvas: "masai maara (Remix)".
const PROJECT = "6a4adad69a876dea0d2d112e";

const clip: Clip = {
  name: "canvas/overview",
  url: `/editor/${PROJECT}/canvas`,
  crf: 26,
  actions: async ({ page, h }) => {
    await page.locator(".react-flow__node").first().waitFor({ state: "visible", timeout: 30_000 });
    await h.beat(800);

    // Frame the whole board, then reset the clip start.
    await page.keyboard.press("Shift+Digit1");
    await h.beat(1400);
    h.mark();

    // Zoom into the dense middle of the grid (⌘ + wheel, anchored at cursor).
    await h.moveTo({ x: 620, y: 320 });
    await h.beat(400);
    await page.keyboard.down("Meta");
    for (let i = 0; i < 3; i++) {
      await page.mouse.wheel(0, -120);
      await page.waitForTimeout(200);
    }
    await page.keyboard.up("Meta");
    await h.beat(800);

    // Slow orbit across the node clusters (scroll pans the board).
    for (let i = 0; i < 9; i++) {
      await page.mouse.wheel(42, 20);
      await page.waitForTimeout(120);
    }
    await h.beat(600);
    for (let i = 0; i < 9; i++) {
      await page.mouse.wheel(-46, 16);
      await page.waitForTimeout(120);
    }
    await h.beat(700);

    // Hover down the left toolbar.
    await h.moveTo(page.getByRole("button", { name: "Add a node" }));
    await h.beat(700);
    await h.moveTo(page.getByRole("button", { name: "Sticky note" }));
    await h.beat(550);
    await h.moveTo(page.getByRole("button", { name: "Auto layout" }));
    await h.beat(600);

    // The Flowy AI dock launcher, bottom-left…
    await h.moveTo(page.getByRole("button", { name: "Open Flowy chat" }));
    await h.beat(1000);
    // …and the composer pill along the bottom.
    await h.moveTo(page.getByRole("button", { name: "Open Flowy AI" }));
    await h.beat(800);

    // End on the whole canvas.
    await h.moveTo({ x: 640, y: 400 });
    await page.keyboard.press("Shift+Digit1");
    await h.beat(1500);
  },
};

export default clip;
