import type { Clip } from "../../lib/runner.ts";

// Blank project created for the agent-actions walkthrough.
const PROJECT = "6a4ceee759aaeb5df4bbb34a";

const clip: Clip = {
  name: "canvas/ai-agent-actions",
  url: `/editor/${PROJECT}/canvas`,
  size: [1920, 1080],
  actions: async ({ page, h }) => {
    await page.getByRole("button", { name: "Skip for now" }).click({ timeout: 4000 }).catch(() => {});
    await h.beat(800);

    // Open the chat panel and start clean.
    await h.click(page.getByRole("button", { name: "Open Flowy chat" }));
    const composer = page.getByRole("textbox", { name: "Ask Flowy to build, wire, or generate…" });
    await composer.waitFor({ state: "visible", timeout: 15_000 });
    await page.getByRole("button", { name: "New chat" }).click({ timeout: 4000 }).catch(() => {});
    await h.beat(900);
    h.mark();

    // One prompt, whole board.
    await h.type(
      composer,
      "Set up a product-launch board for a smart water bottle: a brand-brief text node, three image concepts wired from the brief, and a video node fed by the hero concept. Arrange it neatly — don't generate yet.",
      14,
    );
    await h.beat(500);
    await page.keyboard.press("Enter");

    // Skip the thinking, land as the first nodes appear.
    await h.skip(async () => {
      await page.locator(".react-flow__node").first().waitFor({ state: "visible", timeout: 240_000 });
    });
    // Let a stretch of the build play out in real time.
    await h.beat(5000);
    await page.keyboard.press("Shift+Digit1");
    await h.beat(2500);

    // Skip to the finished board — the composer's idle placeholder returns
    // once the turn is done.
    await h.skip(async () => {
      await composer.waitFor({ state: "visible", timeout: 300_000 });
      await page.waitForTimeout(1200);
    });
    // Deselect so no node settings panel covers the graph, then fit.
    await page.keyboard.press("Escape");
    await h.beat(300);
    await h.click({ x: 1700, y: 950 });
    await h.beat(400);
    await page.keyboard.press("Shift+Digit1");
    await h.beat(1500);
    // Sweep across the finished graph, then rest.
    await h.moveTo({ x: 700, y: 420 });
    await h.beat(900);
    await h.moveTo({ x: 1400, y: 560 });
    await h.beat(2200);
  },
};

export default clip;
