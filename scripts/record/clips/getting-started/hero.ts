import type { Clip } from "../../lib/runner.ts";

/**
 * index.mdx hero — "Nodes generate, connect, and flow into a finished edit on
 * the Flowy canvas."
 *
 * The seeded `masai maara` board is the prettiest canvas we have — a savanna
 * photo series (elephants, giraffes, acacia, balloons) wired through routers.
 * READ-ONLY: fit, then a slow orbit/zoom across the image clusters. No node is
 * added, moved, or run. Starts and ends on the fitted board so the loop is seamless.
 */
const PROJECT = "6a4adad69a876dea0d2d112e";

const clip: Clip = {
  name: "getting-started/hero",
  url: `/editor/${PROJECT}/canvas`,
  crf: 26,
  actions: async ({ page, h }) => {
    await page.locator(".react-flow__node").first().waitFor({ state: "visible", timeout: 30_000 });
    const skip = page.getByRole("button", { name: "Skip for now" });
    if (await skip.isVisible({ timeout: 4000 }).catch(() => false)) {
      await h.click(skip);
      await h.beat(400);
    }
    await h.beat(500);
    // Whole board.
    await page.keyboard.press("Shift+Digit1");
    await h.beat(1500);
    h.mark();

    const panBy = async (dx: number, dy: number, steps: number, wait = 90) => {
      for (let i = 0; i < steps; i++) {
        await page.mouse.wheel(dx, dy);
        await page.waitForTimeout(wait);
      }
    };
    const zoom = async (dir: "in" | "out", steps: number, wait = 220) => {
      await page.keyboard.down("Meta");
      for (let i = 0; i < steps; i++) {
        await page.mouse.wheel(0, dir === "in" ? -100 : 110);
        await page.waitForTimeout(wait);
      }
      await page.keyboard.up("Meta");
    };

    // Center the cursor on the content column so zoom pushes into the imagery
    // (react-flow zooms toward the pointer), never off the board edge.
    await page.mouse.move(720, 380, { steps: 6 });
    await h.beat(400);
    // Ease in on the central savanna scenes.
    await zoom("in", 3);
    await h.beat(800);
    // Drift down through the rows toward the balloons and video scenes.
    await panBy(0, 55, 9);
    await h.beat(600);
    // Push in for a closer read of a scene.
    await zoom("in", 2);
    await h.beat(900);
    // Slow drift back up.
    await panBy(-18, -45, 8);
    await h.beat(700);
    // Pull back out to the whole board again.
    await zoom("out", 5);
    await h.beat(500);
    await page.keyboard.press("Shift+Digit1");
    await h.beat(1600);
  },
};

export default clip;
