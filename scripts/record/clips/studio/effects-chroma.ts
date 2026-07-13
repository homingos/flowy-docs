import type { Clip } from "../../lib/runner.ts";
import { insp, scrubValue, selectClip, studioReady, studioUrl, subTab } from "./_helpers.ts";

/**
 * studio/effects/chroma-key.mdx — on the Compositing tab, enable the chroma
 * keyer, pick a screen colour, and tune Similarity and Blend. (No green-screen
 * clip on hand, so this shows the control panel and keying an ocean's blues.)
 */
const clip: Clip = {
  name: "studio/effects-chroma",
  url: studioUrl(),
  actions: async ({ page, h }) => {
    await studioReady(page);
    await selectClip(page, 3);
    await subTab(page, "Compositing");
    const i = insp(page);
    const enable = i.getByRole("checkbox", { name: "Enable chroma key removal" });
    // Start disabled so the enable is part of the take.
    if (await enable.isChecked().catch(() => false)) {
      await enable.click();
      await page.waitForTimeout(400);
    }
    await h.beat(500);
    h.mark();

    // Turn the keyer on — the controls reveal below the checkbox.
    await h.click(i.getByText("Enable chroma key removal"));
    await h.beat(900);

    // Pick the screen colour to remove.
    const screen = i.locator("select").filter({ has: page.locator('option', { hasText: "Green" }) }).first();
    await h.moveTo(screen);
    await screen.selectOption({ label: "Blue" }).catch(() => {});
    await h.beat(800);

    // Raise Similarity until the screen colour drops out, then soften with Blend.
    await scrubValue(page, h, "Similarity", 60);
    await h.beat(800);
    await scrubValue(page, h, "Blend", 45);
    await h.beat(1100);
  },
};

export default clip;
