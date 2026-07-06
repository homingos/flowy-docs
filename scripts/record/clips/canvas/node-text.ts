import type { Clip } from "../../lib/runner.ts";

// Busy seeded canvas: "masai maara (Remix)".
const PROJECT = "6a4adad69a876dea0d2d112e";

const clip: Clip = {
  name: "canvas/node-text",
  url: `/editor/${PROJECT}/canvas`,
  crf: 26,
  actions: async ({ page, h }) => {
    await page.locator(".react-flow__node").first().waitFor({ state: "visible", timeout: 30_000 });
    await h.beat(800);
    await page.keyboard.press("Shift+Digit1");
    await h.beat(1200);

    // Frame one of the seeded image nodes, with margin.
    const imgNode = page
      .locator(".react-flow__node-staticImageBlock")
      .filter({ has: page.locator("img[alt='Generated result']") })
      .first();
    await h.click(imgNode);
    await page.keyboard.press("Shift+Digit2");
    await h.beat(1000);
    await h.moveTo({ x: 640, y: 400 });
    await page.keyboard.down("Meta");
    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(200);
    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(200);
    await page.mouse.wheel(0, 120);
    await page.keyboard.up("Meta");
    await h.beat(500);
    await h.click({ x: 250, y: 680 });
    await h.beat(400);
    h.mark();

    // Drop a Text node in the open space beside the image with ⇧T.
    const box = await imgNode.boundingBox();
    const spawnX = Math.max(170, (box?.x ?? 500) - 260);
    const spawnY = (box?.y ?? 300) + (box?.height ?? 200) / 2;
    await h.moveTo({ x: spawnX, y: spawnY });
    await h.beat(300);
    await page.keyboard.press("Shift+T");
    const textNode = page.locator(".react-flow__node-textBlock").first();
    await textNode.waitFor({ state: "visible", timeout: 8000 });
    await h.beat(400);
    await page.keyboard.type("Golden-hour safari brief:", { delay: 40 });
    await page.keyboard.press("Shift+Enter");
    await page.keyboard.type("warm dusk light, wildlife silhouettes", { delay: 40 });
    await h.beat(700);

    // Click away, then peek at the node's ⋮ menu.
    await h.click({ x: 250, y: 680 });
    await h.beat(400);
    await h.click(textNode.getByRole("button", { name: "Node options" }));
    await h.beat(1200);
    await page.keyboard.press("Escape");
    await h.beat(400);

    // Feed it into the image node alongside. Handles hide until hovered, so
    // aim by geometry: output sits just right of the text node, input just
    // left of the image node, both at mid-height.
    const tBox = await textNode.boundingBox();
    const iBox = await imgNode.boundingBox();
    if (!tBox || !iBox) throw new Error("missing node boxes");
    await h.drag(
      { x: tBox.x + tBox.width + 17, y: tBox.y + tBox.height / 2 + 14 },
      { x: iBox.x - 20, y: iBox.y + iBox.height / 2 },
    );
    await h.beat(600);
    await h.click({ x: 250, y: 680 });
    await h.moveTo({ x: 520, y: 560 });
    await h.beat(1200);
  },
};

export default clip;
