import type { Clip } from "../../lib/runner.ts";

/**
 * dashboard/brand-kit.mdx — "build a brand kit and apply it on the canvas."
 *
 * Extract a kit from a website URL on the Brand Kit page (background processing
 * jump-cut), review the captured logo / fonts / colors, then hop into a canvas,
 * add a Brand Kit node and attach the kit. Recorded at 1280×800 — the canvas
 * segment mis-renders at a 1920-wide headed viewport.
 */
const CANVAS_PROJECT = "6a4b79b9514413fa84caca9f";

const clip: Clip = {
  name: "dashboard/brand-kit",
  url: "/dashboard/brandkit",
  crf: 26,
  speed: 1.25,
  actions: async ({ page, h, baseUrl }) => {
    await page.getByRole("heading", { name: "Extract a brand kit" }).waitFor({ state: "visible", timeout: 15_000 });
    await page.getByRole("button", { name: "Dismiss promo" }).click({ timeout: 1500 }).catch(() => {});
    await h.beat(500);
    h.mark();

    // Paste a brand URL and extract.
    const urlBox = page.getByRole("textbox", { name: "example.com" });
    await h.click(urlBox);
    await page.keyboard.type("figma.com", { delay: 55 });
    await h.beat(500);
    await h.click(page.getByRole("button", { name: "Extract" }));
    await h.beat(600);
    // Extraction runs in the background — jump-cut until the kit is ready.
    await h.skip(async () => {
      await page.getByText("Figma", { exact: true }).first().waitFor({ state: "visible", timeout: 120_000 });
      await page.getByRole("button", { name: "View" }).first().waitFor({ state: "attached", timeout: 120_000 }).catch(() => {});
      await page.waitForTimeout(1200);
    });
    await h.beat(600);

    // Review the captured kit — logo, fonts, colors.
    const card = page.getByText("Figma", { exact: true }).first();
    const cb = await card.boundingBox();
    if (cb) {
      await h.moveTo({ x: cb.x + cb.width / 2, y: cb.y - 70 });
      await h.beat(1600);
    }

    // Over to a canvas to put the kit to work.
    await h.skip(async () => {
      await page.goto(`${baseUrl}/editor/${CANVAS_PROJECT}/canvas`, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.getByRole("button", { name: "Skip for now" }).click({ timeout: 8000 }).catch(() => {});
      await page.getByRole("button", { name: "Add a node" }).waitFor({ state: "visible", timeout: 30_000 });
      await page.waitForTimeout(800);
    });
    await page.mouse.move(640, 400, { steps: 4 });
    await h.beat(500);

    // Add a Brand Kit node.
    await h.click(page.getByRole("button", { name: "Add a node" }));
    await h.beat(400);
    await h.click(page.locator('[aria-label="Node selection"]').getByRole("button", { name: /^Brand Kit/ }));
    const search = page.getByRole("textbox", { name: /Search kits/ }).first();
    await search.waitFor({ state: "visible", timeout: 8000 });
    await h.beat(700);

    // Search for the kit and attach it.
    await h.click(search);
    await page.keyboard.type("fig", { delay: 70 });
    await h.beat(800);
    const figResult = page.getByRole("button", { name: "Figma" }).first();
    await figResult.waitFor({ state: "visible", timeout: 6000 });
    await h.click(figResult);
    await h.beat(700);
    // Let the attached kit's thumbnail finish loading before we rest on it.
    await page
      .getByText("Loading Figma", { exact: false })
      .first()
      .waitFor({ state: "hidden", timeout: 20_000 })
      .catch(() => {});
    await h.beat(600);

    // The kit is now attached to the node, ready to feed a workflow.
    await page.keyboard.press("Shift+Digit1");
    await h.beat(1000);
    // Hover the node to reveal the applied kit — logo, colors, fonts.
    const applied = page.locator('[data-testid^="rf__node-brandkit"]').first();
    const ab = await applied.boundingBox();
    if (ab) {
      await h.moveTo({ x: ab.x + ab.width / 2, y: ab.y + ab.height / 2 });
      await h.beat(1600);
    } else {
      await h.beat(1400);
    }
  },
};

export default clip;
