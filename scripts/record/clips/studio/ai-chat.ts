import type { Clip } from "../../lib/runner.ts";
import { aibar, studioReady, studioUrl } from "./_helpers.ts";

/**
 * studio/ai-chat.mdx — the docked AI sidebar: quick-action chips, the modes
 * menu, then a plain-language edit request sent to the assistant.
 */
const clip: Clip = {
  name: "studio/ai-chat",
  url: studioUrl(),
  actions: async ({ page, h }) => {
    await studioReady(page);
    const ai = aibar(page);
    await ai.getByRole("textbox").first().waitFor({ state: "visible", timeout: 20_000 });
    await h.beat(500);
    h.mark();

    // Quick-action chips get you moving.
    await h.moveTo(ai.getByRole("button", { name: "Build a rough cut" }));
    await h.beat(500);
    await h.moveTo(ai.getByRole("button", { name: "Add a voiceover" }));
    await h.beat(500);

    // The modes menu — Flowy AI vs Scene planner.
    await h.click(ai.getByRole("button", { name: "Flowy AI" }));
    await h.beat(1000);
    await page.keyboard.press("Escape");
    await h.beat(400);

    // Type a plain-language edit request and send it.
    const composer = ai.getByRole("textbox").first();
    await h.type(composer, "Fade in the first clip over one second");
    await h.beat(400);
    await h.click(ai.getByRole("button", { name: "Send" }));

    // Show the request land in the thread and the assistant start working.
    await h.beat(700);
    await h.skip(async () => {
      await page.waitForTimeout(2600);
    });
    await h.beat(1400);
  },
};

export default clip;
