import type { Clip } from "../../lib/runner.ts";

// Busy seeded canvas: "masai maara (Remix)".
const PROJECT = "6a4adad69a876dea0d2d112e";

const clip: Clip = {
  name: "canvas/node-utility",
  url: `/editor/${PROJECT}/canvas`,
  crf: 26,
  speed: 1.25,
  actions: async ({ page, h }) => {
    await page.locator(".react-flow__node").first().waitFor({ state: "visible", timeout: 30_000 });
    await h.beat(800);
    await page.keyboard.press("Shift+Digit1");
    await h.beat(1300);
    h.mark();

    const baseRouters = await page.locator(".react-flow__node-router").count();

    // Group: marquee a cluster, frame it with ⌘G…
    await h.moveTo({ x: 132, y: 762 });
    await page.mouse.down();
    await page.mouse.move(338, 502, { steps: 30 });
    await page.mouse.up();
    await h.beat(700);
    await page.keyboard.press("Meta+g");
    await h.beat(1300);
    // …then release it with Ungroup in the selection bar.
    await h.click(page.getByRole("button", { name: "Ungroup" }));
    await h.beat(800);
    await h.click({ x: 120, y: 250 });
    await h.beat(500);

    // Sticky note: annotate the board without joining the graph.
    await h.moveTo({ x: 420, y: 300 });
    await page.keyboard.down("Meta");
    for (let i = 0; i < 6; i++) {
      await page.mouse.wheel(0, -120);
      await page.waitForTimeout(130);
    }
    await page.keyboard.up("Meta");
    await h.beat(400);
    await h.click(page.getByRole("button", { name: "Sticky note" }));
    await h.beat(300);
    await h.click({ x: 430, y: 310 });
    await h.beat(400);
    await h.click({ x: 430, y: 310 });
    await page
      .waitForFunction(() => (document.activeElement as HTMLElement | null)?.isContentEditable ?? false, undefined, { timeout: 3000 })
      .catch(() => {});
    await page.keyboard.type("Pick the hero shot 📌", { delay: 50 });
    await h.beat(600);
    await h.click({ x: 260, y: 640 });
    await h.beat(400);

    // Router: a many-to-many hub, straight from the add-node menu.
    await h.click(page.getByRole("button", { name: "Add a node" }));
    await h.beat(400);
    const menu = page.locator('[aria-label="Node selection"]');
    await h.click(menu.getByRole("button", { name: /^Router/ }));
    const router = page.locator(".react-flow__node-router").nth(baseRouters);
    await router.waitFor({ state: "visible", timeout: 8000 });
    await h.beat(700);
    // Show its input and output sides.
    const rBox = await router.boundingBox();
    if (rBox) {
      await h.moveTo({ x: rBox.x - 8, y: rBox.y + rBox.height / 2 });
      await h.beat(500);
      await h.moveTo({ x: rBox.x + rBox.width + 8, y: rBox.y + rBox.height / 2 });
      await h.beat(600);
    }

    // Put the canvas back: undo the router and the note.
    await h.click({ x: 260, y: 640 });
    await h.beat(300);
    const undoBtn = page.getByRole("button", { name: "Undo" });
    for (let i = 0; i < 5; i++) {
      const stickies = await page.locator(".react-flow__node-stickyNote").count();
      const routers = await page.locator(".react-flow__node-router").count();
      if (stickies === 0 && routers === baseRouters) break;
      await h.click(undoBtn);
      await h.beat(450);
    }
    await page.keyboard.press("Shift+Digit1");
    await h.beat(1000);
  },
};

export default clip;
