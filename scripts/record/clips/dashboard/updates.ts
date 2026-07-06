import type { Clip } from "../../lib/runner.ts";

/**
 * dashboard/updates.mdx — "Scrolling the Updates timeline of Flowy releases".
 * Public /updates page: drift down through a release entry or two, unhurried.
 * Stops on the v0.1.0 entry — never reaches the footer.
 */
const clip: Clip = {
  name: "dashboard/updates",
  url: "/updates",
  actions: async ({ page, h }) => {
    await page.getByRole("heading", { name: "Product updates" }).waitFor({ state: "visible" });
    await page.mouse.move(640, 430, { steps: 8 });
    await h.beat(1200);

    // Slow drift down the v0.2.0 entry… (the page is short — stay well away
    // from the footer)
    for (let i = 0; i < 5; i++) {
      await h.scroll(120);
      await h.beat(450);
    }
    await h.beat(800);

    // …and settle as the v0.1.0 public-beta entry peeks into view.
    await h.scroll(60);
    await h.beat(1500);
  },
};

export default clip;
