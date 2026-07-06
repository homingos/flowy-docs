import type { Clip } from "../../lib/runner.ts";

// Fresh, isolated project created for the AI-chat clips.
const PROJECT = "6a4b7988514413fa84caca94";

const clip: Clip = {
  name: "canvas/ai-memory",
  url: `/editor/${PROJECT}/canvas`,
  crf: 24,
  actions: async ({ page, h }) => {
    await page.getByRole("button", { name: "Skip for now" }).click({ timeout: 4000 }).catch(() => {});
    await h.beat(600);

    // Open the chat panel from the bottom-left launcher.
    await h.click(page.getByRole("button", { name: "Open Flowy chat" }));
    await page.getByRole("button", { name: "Send" }).waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});
    await h.beat(900);
    h.mark();

    // The Skills library lives behind the book icon in the panel header.
    await h.click(page.getByRole("button", { name: "Skill library" }));
    await h.beat(1300);
    // Rest on the library body (empty until Flowy captures a build, or a list).
    await h.moveTo({ x: 1000, y: 220 });
    await h.beat(1600);
    await page.keyboard.press("Escape");
    await h.beat(700);

    // Save a durable preference — Flowy acknowledges and stores it as memory.
    const composer = page.getByRole("textbox").last();
    await h.type(composer, "Remember: I prefer warm, golden-hour lighting");
    await h.beat(400);
    await h.click(page.getByRole("button", { name: "Send" }));
    await h.skip(async () => {
      // Wait for the turn to settle: the working indicator clears and an
      // assistant acknowledgment lands.
      await page.getByRole("button", { name: "Stop" }).waitFor({ state: "visible", timeout: 8000 }).catch(() => {});
      await page.getByRole("button", { name: "Stop" }).waitFor({ state: "hidden", timeout: 90_000 }).catch(() => {});
    });
    await h.beat(1600);
  },
};

export default clip;
