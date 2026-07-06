import type { Clip } from "../../lib/runner.ts";

/**
 * help/exporting.mdx — "Downloading a node's asset…".
 *
 * A pre-generated image node ("Vintage Convertible") lives in this fresh
 * project. Right-click it → the node menu's Download row is an "Export as…"
 * submenu for image content → pick a format (PNG). A clean node-download loop.
 */
const PROJECT = "6a4b63dd1263d94b3dfbdd45";

const clip: Clip = {
  name: "help/exporting",
  url: `/editor/${PROJECT}/canvas`,
  crf: 26,
  actions: async ({ page, h }) => {
    const skip = page.getByRole("button", { name: "Skip for now" });
    if (await skip.isVisible({ timeout: 8000 }).catch(() => false)) {
      await h.click(skip);
      await h.beat(500);
    }
    await page
      .locator(".react-flow__node")
      .filter({ has: page.locator("img[alt='Generated result']") })
      .first()
      .waitFor({ state: "visible", timeout: 30_000 });
    // Frame the image node, then pull back a touch so the menu has room.
    await page.keyboard.press("Shift+Digit1");
    await h.beat(1000);
    await page.mouse.move(640, 400, { steps: 4 });
    await page.keyboard.down("Meta");
    await page.mouse.wheel(0, 120);
    await page.keyboard.up("Meta");
    await h.beat(600);
    h.mark();

    const img = page
      .locator(".react-flow__node")
      .filter({ has: page.locator("img[alt='Generated result']") })
      .first();
    const box = await img.boundingBox();
    if (!box) throw new Error("no generated image node");

    // Right-click near the top-left of the image so the menu opens with room
    // to the right for the Export-as submenu.
    await h.moveTo({ x: box.x + 60, y: box.y + 40 });
    await h.beat(400);
    await page.mouse.click(box.x + 60, box.y + 40, { button: "right" });
    await h.beat(900);

    // Hover the "Export as…" row — its format submenu fans out to the side.
    const trigger = page.getByRole("button", { name: "Export as…" }).first();
    const tb = await trigger.boundingBox();
    if (!tb) throw new Error("no Export as… trigger");
    await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2, { steps: 14 });
    await h.beat(800);
    const panel = page.getByRole("menu", { name: "Export as" });
    const pnb = await panel.boundingBox();
    if (!pnb) throw new Error("no Export as submenu");
    // Slide straight into the panel (a curved path drops the hover).
    await page.mouse.move(pnb.x + 24, tb.y + tb.height / 2, { steps: 12 });
    await h.beat(400);

    const hoverRow = async (name: string, dwell: number) => {
      const it = panel.getByRole("button", { name, exact: true }).first();
      const ib = await it.boundingBox();
      if (!ib) return null;
      await page.mouse.move(ib.x + ib.width / 2, ib.y + ib.height / 2, { steps: 10 });
      await h.beat(dwell);
      return ib;
    };
    await hoverRow("JPG", 450);
    const png = await hoverRow("PNG", 550);

    // Pick PNG — the browser downloads the file.
    if (png) {
      const dl = page.waitForEvent("download", { timeout: 8000 }).catch(() => null);
      await page.mouse.click(png.x + png.width / 2, png.y + png.height / 2);
      await dl;
    }
    await h.beat(700);
    // Rest on the framed image.
    await h.moveTo({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
    await h.beat(1200);
  },
};

export default clip;
