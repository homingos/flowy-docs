import type { Clip } from "../../lib/runner.ts";

// "masai maara (Remix)" — the assistant pre-wired 'Compose Test': three
// stills connected as @Element references on a Compose-mode video node.
// The dev backend can't run Compose generations, so this clip walks the
// setup — scene, elements, motion tabs, output controls, live cost.
const PROJECT = "6a4adad69a876dea0d2d112e";
const NODE_ID = "video_06eb251052104a788849ae24d6d99434";

const clip: Clip = {
  name: "canvas/node-video-kling",
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
    if (!box) throw new Error("Compose Test node not found");
    await page.mouse.click(box.x + Math.min(box.width * 0.4, 150), box.y + 6);
    await page.waitForTimeout(500);
    await page.keyboard.press("Shift+Digit2");
    await h.beat(900);
    h.mark();

    // Select the node — the Compose panel opens on the right.
    box = await node.boundingBox();
    if (!box) throw new Error("node left view");
    await h.click({ x: box.x + Math.min(box.width * 0.4, 150), y: box.y + 8 });
    await h.beat(1400);

    // Inputs: the scene background and each connected element.
    const scene = page.getByRole("button", { name: /Scene background/ });
    if (await scene.isVisible().catch(() => false)) {
      await h.moveTo(scene);
      await h.beat(1000);
    }
    for (const alt of ["Element 1", "Element 2"]) {
      const el = page.getByRole("img", { name: alt }).first();
      if (await el.isVisible().catch(() => false)) {
        await h.moveTo(el);
        await h.beat(800);
      }
    }

    // Motion: flip to Multi-shot and back — per-shot authoring lives here.
    const multi = page.getByRole("tab", { name: "Multi-shot" });
    if (await multi.isVisible().catch(() => false)) {
      await h.click(multi);
      await h.beat(1600);
      await h.click(page.getByRole("tab", { name: "One prompt" }));
      await h.beat(900);
    }

    // Output: duration options and the prompt-strength slider.
    const dur = page.getByRole("combobox", { name: "Duration" });
    if (await dur.isVisible().catch(() => false)) {
      await h.moveTo(dur);
      await h.beat(800);
    }
    const slider = page.getByRole("slider").first();
    if (await slider.isVisible().catch(() => false)) {
      await h.moveTo(slider);
      await h.beat(900);
    }

    // Rest on the @Element prompt in the node, then the cost estimate.
    box = await node.boundingBox();
    if (box) {
      await h.moveTo({ x: box.x + box.width / 2, y: box.y + box.height * 0.82 });
      await h.beat(1600);
    }
    const cost = page.getByText(/Cost ~/).first();
    if (await cost.isVisible().catch(() => false)) {
      await h.moveTo(cost);
      await h.beat(1500);
    }
    await h.beat(900);
  },
};

export default clip;
