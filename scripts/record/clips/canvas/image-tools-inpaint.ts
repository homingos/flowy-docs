import type { Clip } from "../../lib/runner.ts";
import type { Locator, Page } from "playwright";

// Fresh project with one generated base image (red sports car, coastal road).
const PROJECT = "6a4b63bc1263d94b3dfbdd3b";

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

/** Paint a mask stroke across the node image: press, weave through points, release. */
async function stroke(page: Page, pts: Array<{ x: number; y: number }>): Promise<void> {
  await page.mouse.move(pts[0].x, pts[0].y, { steps: 8 });
  await page.mouse.down();
  for (const p of pts.slice(1)) await page.mouse.move(p.x, p.y, { steps: 10 });
  await page.mouse.up();
}

const clip: Clip = {
  name: "canvas/image-tools-inpaint",
  url: `/editor/${PROJECT}/canvas`,
  crf: 24,
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

    // Attach Inpaint, then frame the tool node so the paintable image is large.
    await spawnTool(page, base, "Inpaint");
    const tool = page.locator(".react-flow__node-toolBlock").first();
    await tool.waitFor({ state: "visible", timeout: 8000 });
    await h.beat(600);
    await page.keyboard.press("Shift+Digit2");
    await h.beat(1100);

    // Paint a mask over a region (the sky / hillside above the car). Paint is
    // the default mode; the inspector shows Paint / Erase / Clear + Size / Strength,
    // and notes that the fill comes from a connected reference image.
    const img = tool.locator("img").first();
    const b = await img.boundingBox();
    if (b) {
      const cx = b.x + b.width * 0.55;
      const cy = b.y + b.height * 0.36;
      await h.moveTo({ x: cx - 70, y: cy - 30 });
      await h.beat(300);
      await stroke(page, [
        { x: cx - 70, y: cy - 30 },
        { x: cx + 60, y: cy - 24 },
        { x: cx + 70, y: cy + 6 },
        { x: cx - 60, y: cy + 12 },
        { x: cx - 66, y: cy + 40 },
        { x: cx + 64, y: cy + 46 },
      ]);
      await h.beat(700);
      // widen the daub with a second pass
      await stroke(page, [
        { x: cx - 30, y: cy - 6 },
        { x: cx + 30, y: cy - 2 },
        { x: cx + 20, y: cy + 30 },
        { x: cx - 24, y: cy + 26 },
      ]);
      await h.beat(900);
    }

    // Point out the reference requirement in the inspector, then rest.
    await h.moveTo({ x: 1180, y: 128 });
    await h.beat(1500);
  },
};

export default clip;
