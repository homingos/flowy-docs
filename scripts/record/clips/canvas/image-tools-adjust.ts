import type { Clip } from "../../lib/runner.ts";
import type { Locator, Page } from "playwright";

// Fresh project seeded with one generated base image (red sports car, coastal
// road). Crop / Levels / Blur are all local, browser-side tools — no credits.
const PROJECT = "6a4b63bc1263d94b3dfbdd3b";

/** Right-click a node (high, for submenu room) → Tools submenu → pick a tool. */
async function spawnTool(page: Page, node: Locator, name: string): Promise<void> {
  const box = await node.boundingBox();
  if (!box) throw new Error(`no box for ${name}`);
  await page.mouse.move(box.x + box.width / 2, box.y + 24, { steps: 12 });
  await page.waitForTimeout(200);
  await page.mouse.click(box.x + box.width / 2, box.y + 24, { button: "right" });
  await page.waitForTimeout(700);
  const trigger = page.getByRole("button", { name: "Tools" }).filter({ has: page.locator("span") }).first();
  const tb = await trigger.boundingBox();
  if (!tb) throw new Error("no Tools trigger");
  await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2, { steps: 14 });
  await page.waitForTimeout(700);
  const panel = page.getByRole("menu", { name: "Image tools" });
  const pnb = await panel.boundingBox();
  if (!pnb) throw new Error("no Image tools submenu");
  await page.mouse.move(pnb.x + 24, tb.y + tb.height / 2, { steps: 12 });
  await page.waitForTimeout(300);
  const item = panel.getByRole("button", { name, exact: false }).first();
  let ib = await item.boundingBox();
  for (let i = 0; i < 8 && ib && ib.y > 720; i++) {
    await page.mouse.move(pnb.x + pnb.width / 2, 700, { steps: 4 });
    await page.mouse.wheel(0, 160);
    await page.waitForTimeout(180);
    ib = await item.boundingBox();
  }
  if (!ib) throw new Error(`missing tool item: ${name}`);
  await page.mouse.move(ib.x + ib.width / 2, ib.y + ib.height / 2, { steps: 8 });
  await page.waitForTimeout(250);
  await page.mouse.click(ib.x + ib.width / 2, ib.y + ib.height / 2);
}

const clip: Clip = {
  name: "canvas/image-tools-adjust",
  url: `/editor/${PROJECT}/canvas`,
  crf: 24,
  speed: 1.5,
  actions: async ({ page, h }) => {
    await page.getByRole("button", { name: "Skip for now" }).click({ timeout: 4000 }).catch(() => {});
    const base = page
      .locator(".react-flow__node")
      .filter({ has: page.locator("img[alt='Generated result']") })
      .first();
    await base.waitFor({ state: "visible", timeout: 30_000 });
    await h.beat(500);
    await page.keyboard.press("Shift+Digit1");
    await h.beat(1000);
    h.mark();

    // --- Crop: attach, frame the tool node, drag a corner of the crop box in.
    await spawnTool(page, base, "Crop");
    const crop = page.locator(".react-flow__node-toolBlock").first();
    await crop.waitFor({ state: "visible", timeout: 8000 });
    await h.beat(600);
    await page.keyboard.press("Shift+Digit2");
    await h.beat(1100);
    const handle = page.locator('.react-flow__node-toolBlock [class*="cropHandle"]').first();
    const hb = await handle.boundingBox();
    if (hb) {
      // pull the top-left corner toward the image centre → visibly tighter crop
      await h.drag(
        { x: hb.x + hb.width / 2, y: hb.y + hb.height / 2 },
        { x: hb.x + hb.width / 2 + 120, y: hb.y + hb.height / 2 + 110 },
      );
      await h.beat(700);
    }

    // --- Levels: chain off Crop, then drag the histogram midtone (gamma) slider.
    await spawnTool(page, crop, "Levels");
    const levels = page.locator(".react-flow__node-toolBlock").nth(1);
    await levels.waitFor({ state: "visible", timeout: 8000 });
    await h.beat(700);
    await page.keyboard.press("Shift+Digit2");
    await h.beat(900);
    const thumbs = page.locator('[class*="multiSliderThumb"]');
    // Inputs row = first three thumbs: black, gamma, white. Drag gamma left → lift midtones.
    const gamma = thumbs.nth(1);
    const gb = await gamma.boundingBox();
    if (gb) {
      await h.drag(
        { x: gb.x + gb.width / 2, y: gb.y + gb.height / 2 },
        { x: gb.x + gb.width / 2 - 44, y: gb.y + gb.height / 2 },
      );
      await h.beat(500);
      // nudge the black point in for contrast
      const black = thumbs.nth(0);
      const bb = await black.boundingBox();
      if (bb) {
        await h.drag(
          { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 },
          { x: bb.x + bb.width / 2 + 34, y: bb.y + bb.height / 2 },
        );
        await h.beat(700);
      }
    }

    // --- Blur: chain off Levels, pick a type, dial up the strength.
    await spawnTool(page, levels, "Blur");
    const blur = page.locator(".react-flow__node-toolBlock").nth(2);
    await blur.waitFor({ state: "visible", timeout: 8000 });
    await h.beat(700);
    await page.keyboard.press("Shift+Digit2");
    await h.beat(900);
    await h.click(page.getByRole("button", { name: "Box", exact: true }));
    await h.beat(500);
    const size = page.getByRole("spinbutton").last();
    await h.click(size);
    await page.keyboard.press("Meta+A");
    await page.keyboard.type("48", { delay: 90 });
    await page.keyboard.press("Enter");
    await h.beat(900);

    // Pull back to the whole Crop → Levels → Blur chain.
    await page.keyboard.press("Shift+Digit1");
    await h.beat(1600);
  },
};

export default clip;
