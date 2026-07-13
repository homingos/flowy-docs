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
  name: "canvas/image-tools-layers",
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

    // Attach Separate Layers — a connected tool node appears beside the image.
    await spawnTool(page, base, "Layered");
    await page.locator(".react-flow__node-toolBlock").first().waitFor({ state: "visible", timeout: 8000 });
    await h.beat(700);
    await page.keyboard.press("Shift+Digit1");
    await h.beat(1200);

    // Set the Max layers cap (2–6) with the slider before running.
    const maxLayers = page.getByRole("slider").first();
    await h.click(maxLayers);
    for (let i = 0; i < 2; i++) { await page.keyboard.press("ArrowRight"); await h.beat(220); }
    await h.beat(700);
    for (let i = 0; i < 3; i++) { await page.keyboard.press("ArrowLeft"); await h.beat(220); }
    await h.beat(800);

    // Rest on the source → Separate Layers pair, ready to run.
    await h.moveTo({ x: 1133, y: 200 });
    await h.beat(1500);
  },
};

export default clip;
