import type { Clip } from "../../lib/runner.ts";

// Busy seeded canvas: "masai maara (Remix)" — READ-ONLY here (cursor chat and the
// collaborators dropdown never mutate the board).
const PROJECT = "6a4adad69a876dea0d2d112e";

const clip: Clip = {
  name: "canvas/ai-voice-cursor",
  url: `/editor/${PROJECT}/canvas`,
  crf: 24,
  actions: async ({ page, h }) => {
    await page.getByRole("button", { name: "Skip for now" }).click({ timeout: 2500 }).catch(() => {});
    await page.locator(".react-flow__node").first().waitFor({ state: "visible", timeout: 30_000 });
    await h.beat(700);
    await page.keyboard.press("Shift+Digit1");
    await h.beat(1400);
    h.mark();

    // (a) Cursor chat — press "/" over the canvas; a message bubble opens at the
    // pointer. Move there first so the canvas surface has a live pointer position.
    await h.moveTo({ x: 660, y: 400 });
    await h.beat(500);
    await page.keyboard.press("/");
    const cursorInput = page.getByRole("textbox", { name: "Cursor chat message" });
    await cursorInput.waitFor({ state: "visible", timeout: 6000 });
    await h.beat(500);
    await page.keyboard.type("Love this 🔥", { delay: 90 });
    await h.beat(1200);
    // Ephemeral by design — Esc dismisses without leaving a message behind.
    await page.keyboard.press("Escape");
    await h.beat(500);
    // Confirm nothing lingered on the canvas.
    await cursorInput.waitFor({ state: "hidden", timeout: 3000 }).catch(() => {});
    await h.beat(700);

    // (b) Voice — open the header collaborators dropdown and rest on the
    // join-voice mic on your own row (do NOT join).
    await h.click(page.getByRole("button", { name: "Collaborators" }));
    await h.beat(900);
    const micBtn = page
      .getByRole("button", { name: "Turn on mic" })
      .or(page.getByRole("button", { name: "Mute microphone" }))
      .or(page.getByRole("button", { name: "Unmute microphone" }))
      .first();
    if (await micBtn.isVisible().catch(() => false)) {
      await h.moveTo(micBtn);
      await h.beat(1500);
    } else {
      // No LiveKit in this build — dwell on the collaborators dialog instead.
      await h.beat(1400);
    }
    // Close the dropdown without joining.
    await h.click({ x: 660, y: 400 });
    await h.beat(700);
  },
};

export default clip;
