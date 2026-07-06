import type { Clip } from "../../lib/runner.ts";

/**
 * getting-started/concepts.mdx — "Connecting an image node's output into a
 * video node's input passes the result forward."
 *
 * Fresh project: build a Text → Image → Video chain by wiring nodes with the
 * connection menu (click a node's output handle → pick the next node type; the
 * new node lands already connected). No generation — the footage is the wiring
 * itself: nodes connect and flow.
 */
const PROJECT = "6a4b70c11263d94b3dfbdf90";
const VW = 1280;
const VH = 800;

const clip: Clip = {
  name: "getting-started/concepts-connect",
  url: `/editor/${PROJECT}/canvas`,
  crf: 26,
  speed: 1.4,
  actions: async ({ page, h }) => {
    // Dismiss the first-run overlay before the visible clip starts.
    const skip = page.getByRole("button", { name: "Skip for now" });
    if (await skip.isVisible({ timeout: 8000 }).catch(() => false)) {
      await h.click(skip);
      await h.beat(600);
    }
    await h.moveTo({ x: 640, y: 400 });
    await h.beat(500);
    h.mark();

    const menu = page.locator('[aria-label="Node selection"]');

    // Drop a Text node in.
    await h.click(page.getByRole("button", { name: "Add a node" }));
    await h.beat(400);
    await h.click(menu.getByRole("button", { name: /^Text/ }));
    await page.locator(".react-flow__node-textBlock").first().waitFor({ state: "visible", timeout: 8000 });
    await h.beat(500);
    await page.keyboard.type("A calm mountain lake at dawn", { delay: 42 });
    await h.beat(600);
    await h.click({ x: 220, y: 680 });
    await h.beat(300);

    // Wire the next node in the chain by pulling from the output handle.
    const connectTo = async (nodeSel: string, item: string) => {
      // Frame the source node with margin so its radial menu stays on-screen.
      await page.keyboard.press("Shift+Digit1");
      await h.beat(700);
      await page.mouse.move(VW / 2, VH / 2, { steps: 4 });
      await page.keyboard.down("Meta");
      for (let i = 0; i < 3; i++) {
        await page.mouse.wheel(0, 120);
        await page.waitForTimeout(120);
      }
      await page.keyboard.up("Meta");
      await h.beat(400);
      const nb = await page.locator(nodeSel).first().boundingBox();
      if (nb) {
        await page.mouse.move(VW / 2, VH / 2, { steps: 4 });
        await page.mouse.wheel(nb.x + nb.width / 2 - VW * 0.42, nb.y + nb.height / 2 - VH * 0.42);
        await h.beat(400);
      }
      const nb2 = await page.locator(nodeSel).first().boundingBox();
      if (!nb2) throw new Error("no source node " + nodeSel);
      await h.moveTo({ x: nb2.x + nb2.width / 2, y: nb2.y + nb2.height / 2 });
      await h.beat(350);
      const hb = await page.locator(`${nodeSel} .react-flow__handle.source`).first().boundingBox();
      if (!hb) throw new Error("no source handle " + nodeSel);
      await h.click({ x: hb.x + hb.width / 2, y: hb.y + hb.height / 2 });
      await h.beat(600);
      const grp = page.getByRole("group", { name: "Connect node type" });
      const opt = grp.getByRole("button", { name: new RegExp(`^${item}`) }).first();
      await opt.waitFor({ state: "visible", timeout: 6000 });
      await h.click(opt);
      await h.beat(900);
    };

    await connectTo(".react-flow__node-textBlock", "Image");
    await connectTo(".react-flow__node-emptyImageBlock", "Video");

    // Frame the finished, connected chain.
    await page.keyboard.press("Shift+Digit1");
    await h.beat(1400);
    await h.moveTo({ x: 640, y: 420 });
    await h.beat(1200);
  },
};

export default clip;
