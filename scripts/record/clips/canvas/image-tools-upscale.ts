import type { Clip } from "../../lib/runner.ts";
import type { Locator, Page } from "playwright";

// Fresh project with one generated base image (red sports car, coastal road).
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
  name: "canvas/image-tools-upscale",
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

    // Attach the Upscale tool — a connected Upscale node appears beside the image.
    await spawnTool(page, base, "Upscale");
    await page.locator(".react-flow__node-toolBlock").first().waitFor({ state: "visible", timeout: 8000 });
    await h.beat(700);
    await page.keyboard.press("Shift+Digit1");
    await h.beat(1200);

    // Choose the enlargement factor: 4×, then settle on 2×.
    await h.click(page.getByRole("button", { name: "4×", exact: true }));
    await h.beat(800);
    await h.click(page.getByRole("button", { name: "2×", exact: true }));
    await h.beat(800);

    // Flip on Face fix (reveals its Strength control), then back off.
    const faceFix = page.getByRole("button", { name: "Off", exact: true }).first();
    if (await faceFix.isVisible().catch(() => false)) {
      await h.click(faceFix);
      await h.beat(1000);
    }

    // Rest on the source → Upscale pair with its controls ready.
    await h.moveTo({ x: 1133, y: 230 });
    await h.beat(1400);
  },
};

export default clip;
