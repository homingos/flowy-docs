import type { Clip } from "../../lib/runner.ts";

// Busy seeded canvas: "masai maara (Remix)".
const PROJECT = "6a4adad69a876dea0d2d112e";

const clip: Clip = {
  name: "canvas/navigation",
  url: `/editor/${PROJECT}/canvas`,
  crf: 26,
  actions: async ({ page, h }) => {
    await page.locator(".react-flow__node").first().waitFor({ state: "visible", timeout: 30_000 });
    await h.beat(800);
    await page.keyboard.press("Shift+Digit1");
    await h.beat(1300);
    h.mark();

    // Scroll to pan: drift down, then back up.
    await h.moveTo({ x: 640, y: 380 });
    for (let i = 0; i < 5; i++) {
      await page.mouse.wheel(0, 60);
      await page.waitForTimeout(110);
    }
    await h.beat(500);
    for (let i = 0; i < 5; i++) {
      await page.mouse.wheel(30, -60);
      await page.waitForTimeout(110);
    }
    await h.beat(600);

    // Hold ⌘ and scroll to zoom in, then back out.
    await h.moveTo({ x: 620, y: 350 });
    await page.keyboard.down("Meta");
    for (let i = 0; i < 3; i++) {
      await page.mouse.wheel(0, -120);
      await page.waitForTimeout(220);
    }
    await h.beat(700);
    for (let i = 0; i < 2; i++) {
      await page.mouse.wheel(0, 120);
      await page.waitForTimeout(220);
    }
    await page.keyboard.up("Meta");
    await h.beat(600);

    // Back to the whole board, then marquee-select a cluster of nodes.
    await page.keyboard.press("Shift+Digit1");
    await h.beat(1100);
    await h.moveTo({ x: 132, y: 762 });
    await page.mouse.down();
    await page.mouse.move(338, 502, { steps: 34 });
    await page.mouse.up();
    await h.beat(1000);

    // Deselect with a click on empty canvas.
    await h.click({ x: 120, y: 250 });
    await h.beat(600);

    // Nudge a node out of line…
    const stray = page.locator(".react-flow__node-staticImageBlock").first();
    await h.drag(stray, { x: 150, y: 420 });
    await h.beat(500);

    // …then Shift+O auto layout snaps everything tidy again.
    await page.keyboard.press("Shift+o");
    await h.beat(2200);

    // Clean ending: nothing selected.
    await h.click({ x: 120, y: 250 });
    await h.beat(400);
  },
};

export default clip;
