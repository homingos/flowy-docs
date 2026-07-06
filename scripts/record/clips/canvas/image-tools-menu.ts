import type { Clip } from "../../lib/runner.ts";

// Busy seeded canvas: "masai maara (Remix)".
const PROJECT = "6a4adad69a876dea0d2d112e";

const clip: Clip = {
  name: "canvas/image-tools-menu",
  url: `/editor/${PROJECT}/canvas`,
  crf: 26,
  actions: async ({ page, h }) => {
    await page.locator(".react-flow__node").first().waitFor({ state: "visible", timeout: 30_000 });
    await h.beat(800);
    await page.keyboard.press("Shift+Digit1");
    await h.beat(1300);
    const baseCount = await page.locator(".react-flow__node").count();

    // Frame a seeded image node with a little margin.
    const img = page
      .locator(".react-flow__node")
      .filter({ has: page.locator("img[alt='Generated result']") })
      .first();
    await h.click(img);
    await page.keyboard.press("Shift+Digit2");
    await h.beat(1400);
    await page.keyboard.down("Meta");
    await page.mouse.wheel(0, 120);
    await page.keyboard.up("Meta");
    await h.beat(600);
    h.mark();
    await h.beat(500);

    // Right-click the image to open its context menu.
    const box = await img.boundingBox();
    if (!box) throw new Error("no image node box");
    await h.moveTo({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: "right" });
    await h.beat(1000);

    // Hover the Tools row — the submenu with every image tool fans out.
    const tools = page.getByRole("button", { name: "Tools" }).filter({ has: page.locator("span") }).first();
    const tb = await tools.boundingBox();
    if (!tb) throw new Error("no Tools trigger");
    await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2, { steps: 14 });
    await h.beat(900);
    const panel = page.getByRole("menu", { name: "Image tools" });
    const pnb = await panel.boundingBox();
    if (!pnb) throw new Error("no Image tools submenu");

    // Slide straight into the panel (a curved path would drop the hover),
    // then walk down the list.
    await page.mouse.move(pnb.x + 24, tb.y + tb.height / 2, { steps: 12 });
    await h.beat(400);
    const hoverItem = async (name: string, dwell: number) => {
      const it = panel.getByRole("button", { name }).first();
      const ib = await it.boundingBox();
      if (!ib) throw new Error(`missing tool item: ${name}`);
      await page.mouse.move(ib.x + ib.width / 2, ib.y + ib.height / 2, { steps: 10 });
      await h.beat(dwell);
      return ib;
    };
    await hoverItem("Levels", 500);
    await hoverItem("Crop", 450);
    await hoverItem("Upscale", 450);
    await hoverItem("Inpaint", 450);
    await hoverItem("Remove Background", 550);

    // Back up to Levels and attach it — a connected tool node spawns.
    const lb = await hoverItem("Levels", 350);
    await page.mouse.click(lb.x + lb.width / 2, lb.y + lb.height / 2);
    await page.locator(".react-flow__node").nth(baseCount).waitFor({ state: "visible", timeout: 8000 }).catch(() => {});
    // The canvas pans to the new Levels node; its controls open in the inspector.
    await h.beat(2400);

    // Put the canvas back: deselect and undo the tool node.
    await h.click({ x: 140, y: 650 });
    await h.beat(400);
    const undoBtn = page.getByRole("button", { name: "Undo" });
    for (let i = 0; i < 3; i++) {
      const c = await page.locator(".react-flow__node").count();
      if (c <= baseCount) break;
      await h.click(undoBtn);
      await h.beat(800);
    }
    await page.keyboard.press("Shift+Digit1");
    await h.beat(1100);
  },
};

export default clip;
