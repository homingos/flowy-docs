import type { Clip } from "../../lib/runner.ts";
import { studioReady, studioUrl } from "./_helpers.ts";

/**
 * studio/export.mdx (walkthrough) — open the Export panel, show the settings
 * (Scene / Mode / Quality / Codec), start a render, jump-cut the render wait,
 * and land on the finished result with its download affordance.
 */
const clip: Clip = {
  name: "studio/export",
  url: studioUrl("6a4b777a514413fa84caca3d"),
  size: [1920, 1080],
  actions: async ({ page, h }) => {
    await studioReady(page);
    await h.beat(500);
    h.mark();

    // Open the Export panel from the top bar.
    await h.click(page.getByRole("button", { name: /^Export$/ }).first());
    await page.getByText("Export settings").waitFor({ state: "visible", timeout: 15_000 });
    await h.beat(900);

    // Walk the settings: Scene, Mode, Quality (High = 1080p), Codec.
    const combos = page.locator("select");
    const n = await combos.count();
    for (let k = 0; k < Math.min(n, 4); k++) {
      await h.moveTo(combos.nth(k));
      await h.beat(500);
    }
    // Confirm High quality (renders at up to 1080p).
    await combos.filter({ has: page.locator('option', { hasText: "High" }) }).first()
      .selectOption({ label: "High" }).catch(() => {});
    await h.beat(700);

    // Start the render — the panel flips to Export history with live progress.
    await h.click(page.getByRole("button", { name: /^Export$/ }).last());
    await h.beat(1500);

    // Jump-cut the render wait; land on the finished entry if it completes.
    await h.skip(async () => {
      const done = page.getByRole("button", { name: /^Download$/ });
      await done.first().waitFor({ state: "visible", timeout: 230_000 }).catch(() => {});
      await page.waitForTimeout(800);
    });
    await h.beat(1600);
  },
};

export default clip;
