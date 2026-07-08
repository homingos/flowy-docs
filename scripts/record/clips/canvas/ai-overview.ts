import type { Clip } from "../../lib/runner.ts";

// AI-chat sandbox project ("Midnight Meadow") — holds a seeded product-brief
// text node the assistant can build from.
const PROJECT = "6a4b7988514413fa84caca94";

const clip: Clip = {
  name: "canvas/ai-overview",
  url: `/editor/${PROJECT}/canvas`,
  crf: 24,
  actions: async ({ page, h }) => {
    await page.getByRole("button", { name: "Skip for now" }).click({ timeout: 4000 }).catch(() => {});
    await page.locator(".react-flow__node").first().waitFor({ state: "visible", timeout: 30_000 });
    await h.beat(800);
    await page.keyboard.press("Shift+Digit1"); // zoom to fit
    await h.beat(1000);
    const before = await page.locator(".react-flow__node").count();
    h.mark();

    // Open the prompt dock at the bottom of the canvas and send a request.
    await h.click(page.getByRole("button", { name: "Open Flowy AI" }));
    const composer = page.getByRole("textbox", { name: "Describe what you want to generate…" });
    await composer.waitFor({ state: "visible", timeout: 8000 });
    await h.beat(600);
    await h.type(
      composer,
      "Create three image nodes from this brief — hero shot, detail macro, lifestyle scene — and wire the brief into each. Don't generate yet.",
      18,
    );
    await h.beat(500);
    await page.keyboard.press("Enter");

    // The chat panel opens with the request running — wait for nodes to land.
    await h.skip(async () => {
      await page
        .locator(".react-flow__node")
        .nth(before + 2)
        .waitFor({ state: "visible", timeout: 180_000 });
      await page.waitForTimeout(1500);
    });
    await h.beat(900);

    // Frame the fresh build and let it breathe.
    await page.keyboard.press("Shift+Digit1");
    await h.beat(1200);
    await h.moveTo({ x: 900, y: 400 });
    await h.beat(1800);
  },
};

export default clip;
