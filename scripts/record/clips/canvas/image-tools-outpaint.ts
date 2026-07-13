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

const clip: Clip = {
  name: "canvas/image-tools-outpaint",
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

    // Attach Outpaint, then frame the tool node with its expansion handles.
    await spawnTool(page, base, "Outpaint");
    const tool = page.locator(".react-flow__node-toolBlock").first();
    await tool.waitFor({ state: "visible", timeout: 8000 });
    await h.beat(600);
    await page.keyboard.press("Shift+Digit2");
    await h.beat(1000);

    // Locate the 8 expansion handles; drag the top and left ones outward
    // (away from the right-docked inspector) so the Output size climbs.
    const handles = page.locator('[class*="outpaintHandle"]');
    const n = await handles.count();
    const boxes: Array<{ i: number; x: number; y: number }> = [];
    for (let i = 0; i < n; i++) {
      const bb = await handles.nth(i).boundingBox();
      if (bb) boxes.push({ i, x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 });
    }
    if (boxes.length) {
      const minX = Math.min(...boxes.map((b) => b.x));
      const maxX = Math.max(...boxes.map((b) => b.x));
      const minY = Math.min(...boxes.map((b) => b.y));
      const maxY = Math.max(...boxes.map((b) => b.y));
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      const pick = (score: (b: { x: number; y: number }) => number) =>
        boxes.reduce((a, b) => (score(b) < score(a) ? b : a));
      const topMid = pick((b) => Math.abs(b.y - minY) + Math.abs(b.x - cx));
      const leftMid = pick((b) => Math.abs(b.x - minX) + Math.abs(b.y - cy));

      await h.drag({ x: topMid.x, y: topMid.y }, { x: topMid.x, y: topMid.y - 90 });
      await h.beat(800);
      await h.drag({ x: leftMid.x, y: leftMid.y }, { x: leftMid.x - 110, y: leftMid.y });
      await h.beat(900);
    }

    // Rest on the expanded frame with its live Output readout.
    await h.moveTo({ x: 1120, y: 125 });
    await h.beat(1500);
  },
};

export default clip;
