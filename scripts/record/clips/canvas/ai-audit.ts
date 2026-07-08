import type { Clip } from "../../lib/runner.ts";

// "Radiant Dune" — the launch board the agent-actions walkthrough built.
// Safe to mutate: created by this harness, not a seeded showcase.
const PROJECT = "6a4ceee759aaeb5df4bbb34a";

const clip: Clip = {
  name: "canvas/ai-audit",
  url: `/editor/${PROJECT}/canvas`,
  crf: 24,
  actions: async ({ page, h }) => {
    await page.getByRole("button", { name: "Skip for now" }).click({ timeout: 4000 }).catch(() => {});
    await page.locator(".react-flow__node").first().waitFor({ state: "visible", timeout: 30_000 });
    await h.beat(700);
    await page.keyboard.press("Shift+Digit1");
    await h.beat(900);

    // Open the chat panel on a clean thread.
    await h.click(page.getByRole("button", { name: "Open Flowy chat" }));
    const composer = page.getByRole("textbox", { name: "Ask Flowy to build, wire, or generate…" });
    await composer.waitFor({ state: "visible", timeout: 15_000 });
    await page.getByRole("button", { name: "New chat" }).click({ timeout: 4000 }).catch(() => {});
    await h.beat(900);
    h.mark();

    // Ask for the audit.
    await h.type(composer, "Audit the canvas: blockers first, then suggestions. Fix any real blockers.", 20);
    await h.beat(400);
    await page.keyboard.press("Enter");

    // Skip the read/critique pass; return when the turn settles.
    await h.skip(async () => {
      await composer.waitFor({ state: "visible", timeout: 300_000 });
      await page.waitForTimeout(1500);
    });
    // Rest on the audit report in the panel.
    await h.moveTo({ x: 180, y: 400 });
    await h.beat(1600);
    await h.scroll(200);
    await h.beat(2200);
  },
};

export default clip;
