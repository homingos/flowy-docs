import type { Clip } from "../../lib/runner.ts";

// "Midnight Meadow" — mug-story sandbox; the flam joins in open space.
const PROJECT = "6a4b7988514413fa84caca94";

const clip: Clip = {
  name: "canvas/node-flam",
  url: `/editor/${PROJECT}/canvas`,
  crf: 24,
  actions: async ({ page, h }) => {
    await page.getByRole("button", { name: "Skip for now" }).click({ timeout: 4000 }).catch(() => {});
    await page.locator(".react-flow__node").first().waitFor({ state: "visible", timeout: 30_000 });
    await h.beat(800);
    // Pre-mark cleanup: remove flam nodes left by earlier takes.
    await page.keyboard.press("Shift+Digit1");
    await h.beat(800);
    for (let i = 0; i < 3; i++) {
      const stale = page.locator('.react-flow__node[data-id^="flam"]').first();
      if ((await stale.count()) === 0) break;
      const sb = await stale.boundingBox();
      if (!sb) break;
      await page.mouse.click(sb.x + sb.width * 0.4, sb.y + 6);
      await page.waitForTimeout(500);
      await page.keyboard.press("Backspace");
      await page.waitForTimeout(700);
    }
    await page.keyboard.press("Shift+Digit1");
    await h.beat(1000);
    h.mark();

    const ids = async () =>
      page.evaluate(() =>
        Array.from(document.querySelectorAll(".react-flow__node")).map((el) => el.getAttribute("data-id")),
      );

    // Drop a Flam node in open space with ⇧F.
    const before = await ids();
    await h.moveTo({ x: 380, y: 620 });
    await h.beat(400);
    await page.keyboard.press("Shift+F");
    await h.beat(1200);
    const after = await ids();
    const newId = after.find((id) => !before.includes(id));
    if (!newId) throw new Error("flam node did not spawn");
    const node = page.locator(`.react-flow__node[data-id="${newId}"]`);

    // Select it, describe the overlay motion.
    const nb = await node.boundingBox();
    if (!nb) throw new Error("no flam node box");
    await h.click({ x: nb.x + nb.width * 0.4, y: nb.y + 8 });
    await h.beat(900);
    const promptBox = node.getByRole("textbox").first();
    await h.type(promptBox, "Steam wisps curling upward with drifting golden sparkles", 28);
    await h.beat(700);

    // Run it.
    const generate = node.getByRole("button", { name: "Generate" });
    if (!(await generate.isVisible().catch(() => false))) {
      await h.moveTo({ x: nb.x + nb.width / 2, y: nb.y + nb.height / 2 });
      await h.beat(600);
    }
    await h.click(generate);
    await h.skip(async () => {
      // Flams render through a chroma-key canvas; the source <video> stays
      // hidden, so wait for its src to land instead of visibility.
      await page.waitForFunction(
        (nid) => {
          const v = document.querySelector(`.react-flow__node[data-id="${nid}"] video`);
          return Boolean(v?.getAttribute("src"));
        },
        newId,
        { timeout: 480_000 },
      );
      await page.waitForTimeout(3500);
    });
    // Rest on the alpha clip playing in the node.
    const done = await node.boundingBox();
    if (done) await h.moveTo({ x: done.x + done.width / 2, y: done.y + done.height / 2 });
    await h.beat(3000);
  },
};

export default clip;
