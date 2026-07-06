import type { Clip } from "../../lib/runner.ts";

/**
 * help/generating.mdx — "Refining a prompt and re-running a node for a better
 * result."
 *
 * Fresh project. Prompt an Image node vaguely ("a car"), generate, then rewrite
 * the prompt with subject + style + mood and regenerate the same node — the new
 * result is a clear step up. Both generations are jump-cut.
 */
const PROJECT = "6a4b63d61263d94b3dfbdd43";
const RESULT = ".react-flow__node-staticImageBlock img[alt='Generated result']";

const clip: Clip = {
  name: "help/generating",
  url: `/editor/${PROJECT}/canvas`,
  crf: 26,
  speed: 1.4,
  actions: async ({ page, h }) => {
    const skip = page.getByRole("button", { name: "Skip for now" });
    if (await skip.isVisible({ timeout: 8000 }).catch(() => false)) {
      await h.click(skip);
      await h.beat(500);
    }
    await h.moveTo({ x: 640, y: 400 });
    await h.beat(400);
    h.mark();

    // Add an Image node.
    const menu = page.locator('[aria-label="Node selection"]');
    await h.click(page.getByRole("button", { name: "Add a node" }));
    await h.beat(400);
    await h.click(menu.getByRole("button", { name: /^Image/ }));
    const node = page.locator(".react-flow__node-emptyImageBlock").first();
    await node.waitFor({ state: "visible", timeout: 8000 });
    await h.beat(500);

    // A vague prompt.
    const ta = node.locator("textarea").first();
    await h.click(ta);
    await page.keyboard.type("a car", { delay: 90 });
    await h.beat(500);
    await page.keyboard.press("Enter");
    await h.beat(700);
    await h.skip(async () => {
      await page.locator(RESULT).first().waitFor({ state: "visible", timeout: 240_000 });
      await page.waitForTimeout(1200);
    });
    await page.keyboard.press("Shift+Digit1");
    await h.beat(1400);

    // Refine: subject + style + mood, then re-run the same node.
    const oldSrc = await page.locator(RESULT).first().getAttribute("src").catch(() => null);
    const prompt = page.locator(".react-flow__node-staticImageBlock textarea").first();
    await h.click(prompt);
    await page.keyboard.press("Meta+A");
    await h.beat(200);
    await page.keyboard.type(
      "low-angle vintage red convertible on a coastal road, golden hour",
      { delay: 26 },
    );
    await h.beat(600);
    await h.click(page.getByRole("button", { name: "Regenerate" }).first());
    await h.beat(700);
    await h.skip(async () => {
      await page
        .waitForFunction(
          (old) => {
            const im = document.querySelector(
              ".react-flow__node-staticImageBlock img[alt='Generated result']",
            );
            return !!im && im.getAttribute("src") !== old;
          },
          oldSrc,
          { timeout: 240_000 },
        )
        .catch(() => {});
      await page.waitForTimeout(1500);
    });
    await page.keyboard.press("Shift+Digit1");
    await h.beat(1200);

    // Peek at the version history (each run is a fresh take you can compare).
    const version = page.getByRole("button", { name: /Version/ }).first();
    if (await version.isVisible().catch(() => false)) {
      await h.click(version);
      await h.beat(1100);
    }
    // Rest on the improved result.
    await h.moveTo({ x: 640, y: 420 });
    await h.beat(1200);
  },
};

export default clip;
