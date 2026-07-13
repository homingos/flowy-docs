import type { Clip } from "../../lib/runner.ts";

// "Radiant Dune" — the launch board; an SFX node joins it in open space.
const PROJECT = "6a4ceee759aaeb5df4bbb34a";

const clip: Clip = {
  name: "canvas/node-audio",
  url: `/editor/${PROJECT}/canvas`,
  crf: 24,
  actions: async ({ page, h }) => {
    await page.getByRole("button", { name: "Skip for now" }).click({ timeout: 4000 }).catch(() => {});
    await page.locator(".react-flow__node").first().waitFor({ state: "visible", timeout: 30_000 });
    await h.beat(800);
    await page.keyboard.press("Shift+Digit1");
    await h.beat(1000);
    h.mark();

    const ids = async () =>
      page.evaluate(() =>
        Array.from(document.querySelectorAll(".react-flow__node")).map((el) => el.getAttribute("data-id")),
      );

    // Drop an Audio node in open space with ⇧A.
    const before = await ids();
    await h.moveTo({ x: 420, y: 560 });
    await h.beat(400);
    await page.keyboard.press("Shift+A");
    await h.beat(1200);
    const after = await ids();
    const newId = after.find((id) => !before.includes(id));
    if (!newId) throw new Error("audio node did not spawn");
    const node = page.locator(`.react-flow__node[data-id="${newId}"]`);

    // Select it and write the SFX prompt.
    const nb = await node.boundingBox();
    if (!nb) throw new Error("no audio node box");
    await h.click({ x: nb.x + nb.width * 0.4, y: nb.y + 8 });
    await h.beat(800);
    const promptBox = node.getByRole("textbox").first();
    await h.type(promptBox, "Espresso machine steaming milk, cozy café ambience", 30);
    await h.beat(600);

    // Run it.
    const generate = node.getByRole("button", { name: "Generate" });
    if (!(await generate.isVisible().catch(() => false))) {
      await h.moveTo({ x: nb.x + nb.width / 2, y: nb.y + nb.height / 2 });
      await h.beat(600);
    }
    await h.click(generate);
    await h.skip(async () => {
      await node
        .getByRole("button", { name: "Play audio" })
        .waitFor({ state: "visible", timeout: 240_000 });
      await page.waitForTimeout(1200);
    });
    await h.beat(800);

    // Play the clip back — the waveform animates in the node.
    await h.click(node.getByRole("button", { name: "Play audio" }));
    await h.beat(3200);
  },
};

export default clip;
