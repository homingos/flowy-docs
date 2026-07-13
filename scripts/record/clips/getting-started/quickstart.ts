import type { Clip } from "../../lib/runner.ts";

/**
 * getting-started/quickstart.mdx — first project, blank canvas → generated
 * image → set up to animate.
 *
 * Fresh project. Add an Image node, prompt it, generate (jump-cut the wait),
 * then pull a connected Video node from the image's output and describe the
 * motion. We stop at the Video node's Generate button (a 6s clip costs ~2,500
 * credits — outside this recording's budget), so the caption ends on "set up
 * to animate" rather than a rendered clip.
 */
const PROJECT = "6a4b742f1263d94b3dfbe043";
// The react-flow canvas mis-sizes its render surface at a 1920-wide headed
// viewport (a grey band appears right of ~1350px after a fit-zoom), so this
// canvas walkthrough records at the proven-clean 1280×800 like the other
// canvas clips.
const VW = 1280;
const VH = 800;

const clip: Clip = {
  name: "getting-started/quickstart",
  url: `/editor/${PROJECT}/canvas`,
  actions: async ({ page, h }) => {
    const skip = page.getByRole("button", { name: "Skip for now" });
    if (await skip.isVisible({ timeout: 8000 }).catch(() => false)) {
      await h.click(skip);
      await h.beat(500);
    }
    await h.moveTo({ x: VW / 2, y: VH / 2 });
    await h.beat(500);
    h.mark();

    const menu = page.locator('[aria-label="Node selection"]');

    // Add an Image node from the toolbar.
    await h.click(page.getByRole("button", { name: "Add a node" }));
    await h.beat(450);
    await h.click(menu.getByRole("button", { name: /^Image/ }));
    const imgNode = page.locator(".react-flow__node-emptyImageBlock").first();
    await imgNode.waitFor({ state: "visible", timeout: 8000 });
    await h.beat(500);

    // Prompt it and generate.
    const ta = imgNode.locator("textarea").first();
    await h.click(ta);
    await page.keyboard.type("waves rolling onto a tropical beach at sunset, cinematic", { delay: 34 });
    await h.beat(500);
    await page.keyboard.press("Enter");
    await h.beat(700);
    await h.skip(async () => {
      await page
        .locator(".react-flow__node img[alt='Generated result']")
        .first()
        .waitFor({ state: "visible", timeout: 240_000 });
      await page.waitForTimeout(1500);
    });
    // The result renders inside the node.
    await page.keyboard.press("Shift+Digit1");
    await h.beat(1500);

    // Pull a connected Video node from the image's output to animate it.
    // Frame with margin so the output handle's connect menu stays on-screen.
    await page.mouse.move(VW / 2, VH / 2, { steps: 4 });
    await page.keyboard.down("Meta");
    for (let i = 0; i < 3; i++) {
      await page.mouse.wheel(0, 120);
      await page.waitForTimeout(120);
    }
    await page.keyboard.up("Meta");
    await h.beat(500);
    const imgBox = await page.locator(".react-flow__node-staticImageBlock").first().boundingBox();
    if (imgBox) {
      await page.mouse.move(VW / 2, VH / 2, { steps: 4 });
      await page.mouse.wheel(imgBox.x + imgBox.width / 2 - VW * 0.34, imgBox.y + imgBox.height / 2 - VH * 0.46);
      await h.beat(500);
    }
    const img = page.locator(".react-flow__node-staticImageBlock").first();
    const ib = await img.boundingBox();
    if (!ib) throw new Error("no generated image node");
    await h.moveTo({ x: ib.x + ib.width / 2, y: ib.y + ib.height / 2 });
    await h.beat(350);
    const srcH = await page
      .locator(".react-flow__node-staticImageBlock .react-flow__handle.source")
      .first()
      .boundingBox();
    if (!srcH) throw new Error("no image output handle");
    await h.click({ x: srcH.x + srcH.width / 2, y: srcH.y + srcH.height / 2 });
    await h.beat(600);
    const grp = page.getByRole("group", { name: "Connect node type" });
    await h.click(grp.getByRole("button", { name: /^Video/ }).first());
    await h.beat(900);

    // Describe the motion in the new (connected) Video node.
    const videoNode = page.locator(".react-flow__node-videoBlock").first();
    await videoNode.waitFor({ state: "visible", timeout: 8000 });
    await page.keyboard.press("Shift+Digit1");
    await h.beat(1000);
    const vta = videoNode.locator("textarea").first();
    if (await vta.isVisible().catch(() => false)) {
      await h.click(vta);
      await page.keyboard.type("gentle waves, slow push-in, drifting clouds", { delay: 34 });
      await h.beat(600);
    }
    // Rest on the wired image → video pair with the Generate step ready.
    const gen = videoNode.getByRole("button", { name: "Generate" }).first();
    if (await gen.isVisible().catch(() => false)) {
      await h.moveTo(gen);
      await h.beat(1400);
    } else {
      await h.beat(1200);
    }
  },
};

export default clip;
