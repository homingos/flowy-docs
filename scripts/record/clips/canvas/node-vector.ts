import type { Clip } from "../../lib/runner.ts";

// "Midnight Meadow" — holds finished mug images to vectorize.
const PROJECT = "6a4b7988514413fa84caca94";

const clip: Clip = {
  name: "canvas/node-vector",
  url: `/editor/${PROJECT}/canvas`,
  crf: 24,
  actions: async ({ page, h }) => {
    await page.getByRole("button", { name: "Skip for now" }).click({ timeout: 4000 }).catch(() => {});
    await page.locator(".react-flow__node").first().waitFor({ state: "visible", timeout: 30_000 });
    await h.beat(800);
    await page.keyboard.press("Shift+Digit1");
    await h.beat(800);
    // Pre-mark cleanup: drop vector nodes left behind by earlier failed takes.
    for (let i = 0; i < 4; i++) {
      const stale = page.locator('.react-flow__node[data-id^="vector"]').first();
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

    // (a) Generate from text: double-click open space → Vector node.
    const before = await ids();
    await page.mouse.dblclick(360, 560);
    const vectorItem = page.getByRole("button", { name: "Vector", exact: true });
    await vectorItem.waitFor({ state: "visible", timeout: 8000 });
    await h.beat(600);
    await h.click(vectorItem);
    await h.beat(1200);
    const afterSpawn = await ids();
    const newId = afterSpawn.find((id) => !before.includes(id));
    if (!newId) throw new Error("vector node did not spawn");
    const vec = page.locator(`.react-flow__node[data-id="${newId}"]`);

    // Select it, write the prompt, run.
    let vb = await vec.boundingBox();
    if (!vb) throw new Error("no vector box");
    await h.click({ x: vb.x + vb.width * 0.4, y: vb.y + 8 });
    await h.beat(700);
    const promptBox = vec.getByRole("textbox").first();
    await h.type(promptBox, "Minimal line logo of a steaming ceramic mug, teal accent", 30);
    await h.beat(500);
    const generate = vec.getByRole("button", { name: "Generate" });
    await h.click(generate);
    await h.skip(async () => {
      await vec.locator("img").first().waitFor({ state: "visible", timeout: 240_000 });
      await page.waitForTimeout(1500);
    });
    await h.beat(1500);

    // (b) Vectorize a connected image: wire the Hero Shot into the vector
    // node — with an image connected, Generate runs a trace instead.
    const img = page
      .locator(".react-flow__node-staticImageBlock")
      .filter({ has: page.locator("img[alt='Generated result']") })
      .first();
    const ib = await img.boundingBox();
    const tb = await vec.boundingBox();
    if (!ib || !tb) throw new Error("missing boxes for wire");
    // Handle offsets scale with zoom — resolve the real handle elements.
    await h.moveTo({ x: ib.x + ib.width / 2, y: ib.y + ib.height / 2 });
    await h.beat(600); // handles appear on hover
    const srcHandle = await img
      .locator(".react-flow__handle")
      .evaluateAll((els, cx) => {
        const boxes = els.map((el) => el.getBoundingClientRect());
        const right = boxes.filter((b) => b.x + b.width / 2 > cx);
        const b = right[0] ?? boxes[boxes.length - 1];
        return b ? { x: b.x + b.width / 2, y: b.y + b.height / 2 } : null;
      }, ib.x + ib.width / 2)
      .catch(() => null);
    await h.moveTo({ x: tb.x + tb.width / 2, y: tb.y + tb.height / 2 });
    await h.beat(400);
    const dstHandle = await vec
      .locator(".react-flow__handle")
      .evaluateAll((els, cx) => {
        const boxes = els.map((el) => el.getBoundingClientRect());
        const left = boxes.filter((b) => b.x + b.width / 2 < cx);
        const b = left[0] ?? boxes[0];
        return b ? { x: b.x + b.width / 2, y: b.y + b.height / 2 } : null;
      }, tb.x + tb.width / 2)
      .catch(() => null);
    await h.drag(
      srcHandle ?? { x: ib.x + ib.width + 7, y: ib.y + ib.height / 2 + 6 },
      dstHandle ?? { x: tb.x - 4, y: tb.y + tb.height / 2 },
    );
    await h.beat(800);

    // Re-select the vector node and trace the connected image.
    vb = await vec.boundingBox();
    if (!vb) throw new Error("vector node left view");
    const prevSrc = await vec.locator("img").first().getAttribute("src").catch(() => null);
    await h.moveTo({ x: vb.x + vb.width / 2, y: vb.y + vb.height / 2 });
    await h.beat(700);
    const gen2 = vec.getByRole("button", { name: "Generate" });
    if (!(await gen2.isVisible().catch(() => false))) {
      await h.click({ x: vb.x + vb.width * 0.4, y: vb.y + 8 });
      await h.beat(700);
      await h.moveTo({ x: vb.x + vb.width / 2, y: vb.y + vb.height / 2 });
      await h.beat(600);
    }
    await h.click(gen2);
    await h.skip(async () => {
      // Wait for the traced result to replace the previous SVG.
      await page
        .waitForFunction(
          ([nodeId, old]) => {
            const el = document.querySelector(`.react-flow__node[data-id="${nodeId}"] img`);
            return el && el.getAttribute("src") && el.getAttribute("src") !== old;
          },
          [newId, prevSrc] as [string, string | null],
          { timeout: 240_000 },
        )
        .catch(() => {});
      await page.waitForTimeout(1500);
    });
    const zb = await vec.boundingBox();
    if (zb) await h.moveTo({ x: zb.x + zb.width / 2, y: zb.y + zb.height / 2 });
    await h.beat(2200);
  },
};

export default clip;
