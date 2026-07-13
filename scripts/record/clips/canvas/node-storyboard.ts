import type { Clip } from "../../lib/runner.ts";

// "Wandering Sparrow" — holds an unrun storyboard node from the plan build.
const PROJECT = "6a4b79b9514413fa84caca9f";

const clip: Clip = {
  name: "canvas/node-storyboard",
  url: `/editor/${PROJECT}/canvas`,
  size: [1920, 1080],
  actions: async ({ page, h }) => {
    await page.getByRole("button", { name: "Skip for now" }).click({ timeout: 4000 }).catch(() => {});
    await page.locator(".react-flow__node").first().waitFor({ state: "visible", timeout: 30_000 });
    await h.beat(800);
    await page.keyboard.press("Shift+Digit1");
    await h.beat(1000);
    h.mark();

    // Glide into the storyboard node.
    const node = page.locator(".react-flow__node-storyboardBlock").first();
    const far = await node.boundingBox();
    if (!far) throw new Error("no storyboard node");
    await h.moveTo({ x: far.x + far.width / 2, y: far.y + far.height / 2 });
    await h.beat(400);
    await page.keyboard.down("Meta");
    for (let i = 0; i < 14; i++) {
      const b = await node.boundingBox();
      if (!b || b.width > 520) break;
      await page.mouse.wheel(0, -120);
      await page.waitForTimeout(150);
    }
    await page.keyboard.up("Meta");
    await h.beat(900);

    // Select it — settings open on the right.
    let box = await node.boundingBox();
    if (!box) throw new Error("storyboard node left view");
    await h.click({ x: box.x + box.width * 0.4, y: box.y + 8 });
    await h.beat(1200);

    // Write the one-line idea.
    const promptBox = node.getByRole("textbox").first();
    if (await promptBox.isVisible().catch(() => false)) {
      await h.click(promptBox);
      await page.keyboard.press("Meta+A");
      await page.keyboard.type(
        "A handcrafted ceramic mug, from the potter's wheel to the first morning pour — warm and intimate",
        { delay: 18 },
      );
      await h.beat(700);
    }

    // Run it.
    const count0 = await page.locator(".react-flow__node").count();
    box = await node.boundingBox();
    if (!box) throw new Error("storyboard node left view before run");
    await h.moveTo({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
    await h.beat(800);
    const generate = node.getByRole("button", { name: "Generate" });
    if (!(await generate.isVisible().catch(() => false))) {
      await h.click({ x: box.x + box.width * 0.4, y: box.y + 8 });
      await h.beat(700);
    }
    await h.click(generate);

    // The run writes the scene plan and lays out a Storyboard Scenes frame
    // with one image node per scene.
    await h.skip(async () => {
      await page
        .locator(".react-flow__node")
        .nth(count0 + 1)
        .waitFor({ state: "visible", timeout: 420_000 });
      await page.waitForTimeout(2500);
    });
    await page.keyboard.press("Shift+Digit1");
    await h.beat(1500);
    // Sweep over the scenes.
    await h.moveTo({ x: 700, y: 500 });
    await h.beat(900);
    await h.moveTo({ x: 1300, y: 560 });
    await h.beat(2400);
  },
};

export default clip;
