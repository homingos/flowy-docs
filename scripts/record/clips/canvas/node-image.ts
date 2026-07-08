import type { Clip } from "../../lib/runner.ts";

// "Midnight Meadow" — the AI-chat sandbox. Its Hero Shot / Detail Macro /
// Lifestyle Scene image nodes are wired from the product brief, so a run here
// shows reference-conditioned generation.
const PROJECT = "6a4b7988514413fa84caca94";

const clip: Clip = {
  name: "canvas/node-image",
  url: `/editor/${PROJECT}/canvas`,
  size: [1920, 1080],
  actions: async ({ page, h }) => {
    await page.getByRole("button", { name: "Skip for now" }).click({ timeout: 4000 }).catch(() => {});
    await page.locator(".react-flow__node").first().waitFor({ state: "visible", timeout: 30_000 });
    await h.beat(800);
    await page.keyboard.press("Shift+Digit1");
    await h.beat(1000);
    h.mark();

    // Glide into the first empty image node.
    const node = page.locator(".react-flow__node-emptyImageBlock").first();
    const far = await node.boundingBox();
    if (!far) throw new Error("no empty image node");
    await h.moveTo({ x: far.x + far.width / 2, y: far.y + far.height / 2 });
    await h.beat(400);
    await page.keyboard.down("Meta");
    for (let i = 0; i < 14; i++) {
      const b = await node.boundingBox();
      if (!b || b.width > 430) break;
      await page.mouse.wheel(0, -120);
      await page.waitForTimeout(150);
    }
    await page.keyboard.up("Meta");
    await h.beat(900);

    // Pin the node by id — its react-flow class changes once a result lands.
    const nodeId = await node.getAttribute("data-id");
    const pinned = page.locator(`.react-flow__node[data-id="${nodeId}"]`);

    // Select it — the settings panel opens on the right.
    let box = await pinned.boundingBox();
    if (!box) throw new Error("node left view");
    await h.click({ x: box.x + box.width * 0.4, y: box.y + 8 });
    await h.beat(1100);

    // Walk the settings: aspect ratio, then size — the cost row updates live.
    const ratio = page.getByRole("combobox", { name: "Aspect ratio" });
    if (await ratio.isVisible().catch(() => false)) {
      await h.moveTo(ratio);
      await h.beat(500);
      await ratio.selectOption({ label: "3:2" }).catch(() => {});
      await h.beat(900);
    }
    const size = page.getByRole("combobox", { name: "Size" });
    if (await size.isVisible().catch(() => false)) {
      await h.moveTo(size);
      await h.beat(500);
      await size.selectOption({ label: "1K" }).catch(() => {});
      await h.beat(1100);
    }

    // The prompt bar + Generate show while the node is selected; selection
    // may or may not have survived the panel interaction, so check first and
    // only click to select when actually needed.
    const generate = pinned.getByRole("button", { name: "Generate" });
    box = await pinned.boundingBox();
    if (!box) throw new Error("node left view before run");
    await h.moveTo({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
    await h.beat(900);
    if (!(await generate.isVisible().catch(() => false))) {
      await h.click({ x: box.x + box.width * 0.4, y: box.y + 8 });
      await h.beat(700);
      await h.moveTo({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
      await h.beat(700);
    }
    if (!(await generate.isVisible().catch(() => false))) {
      const scratch = process.env.SCRATCH ?? "/tmp";
      await page.screenshot({ path: `${scratch}/node-image-fail.png` });
      console.log(await pinned.ariaSnapshot().catch(() => "no aria"));
    }
    await h.click(generate);
    await h.skip(async () => {
      await pinned
        .locator("img[alt='Generated result']")
        .waitFor({ state: "visible", timeout: 300_000 });
      await page.waitForTimeout(1500);
    });
    // Rest on the finished image.
    const done = await pinned.boundingBox();
    if (done) await h.moveTo({ x: done.x + done.width / 2, y: done.y + done.height / 2 });
    await h.beat(2600);
  },
};

export default clip;
