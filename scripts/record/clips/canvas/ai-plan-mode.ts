import type { Clip } from "../../lib/runner.ts";

// "Wandering Sparrow" — quiet project reserved for the plan-mode clip.
const PROJECT = "6a4b79b9514413fa84caca9f";

const clip: Clip = {
  name: "canvas/ai-plan-mode",
  url: `/editor/${PROJECT}/canvas`,
  crf: 24,
  actions: async ({ page, h }) => {
    await page.getByRole("button", { name: "Skip for now" }).click({ timeout: 4000 }).catch(() => {});
    await h.beat(600);

    // Open the chat panel and start a clean thread.
    await h.click(page.getByRole("button", { name: "Open Flowy chat" }));
    const composer = page.getByRole("textbox", { name: "Ask Flowy to build, wire, or generate…" });
    await composer.waitFor({ state: "visible", timeout: 15_000 });
    await page.getByRole("button", { name: "New chat" }).click({ timeout: 4000 }).catch(() => {});
    await h.beat(800);
    h.mark();

    // A brief big enough to earn a plan.
    await h.type(
      composer,
      "Plan a 3-scene teaser for a handcrafted ceramic mug: storyboard, one image per scene, a hero video, and a soundtrack. Propose the plan first.",
      16,
    );
    await h.beat(400);
    await page.keyboard.press("Enter");

    // Wait out the thinking; land on the proposed plan card.
    const approve = page.getByRole("button", { name: "Approve & build" });
    await h.skip(async () => {
      await approve.waitFor({ state: "visible", timeout: 240_000 });
      await page.waitForTimeout(1000);
    });
    await approve.scrollIntoViewIfNeeded();
    await h.beat(1200);

    // Edit the plan: drop the soundtrack step, then pull the hero video up.
    const steps = page.getByRole("listitem").filter({ has: page.getByRole("button", { name: "Remove step" }) });
    const last = steps.last();
    await last.scrollIntoViewIfNeeded();
    await h.click(last.getByRole("button", { name: "Remove step" }));
    await h.beat(900);
    const nowLast = steps.last();
    await h.click(nowLast.getByRole("button", { name: "Move up" }));
    await h.beat(1100);

    // Approve — the build starts and the plan docks above the composer.
    await approve.scrollIntoViewIfNeeded();
    await h.click(approve);
    await h.skip(async () => {
      // First new node landing on the canvas = the build is underway.
      await page.locator(".react-flow__node").nth(1).waitFor({ state: "visible", timeout: 180_000 });
      await page.waitForTimeout(1500);
    });
    await page.keyboard.press("Shift+Digit1");
    await h.beat(2000);
  },
};

export default clip;
