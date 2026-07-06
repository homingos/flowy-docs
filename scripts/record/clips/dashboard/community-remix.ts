import type { Clip } from "../../lib/runner.ts";

/**
 * dashboard/community.mdx — "Browsing community templates and remixing one
 * into a new project".
 *
 * Opens the Templates tab, previews "TNF - Outfit Try-Ons" (rich thumbnail,
 * not remixed into this workspace, and its frozen template doc clones with
 * content), hits Remix, picks the workspace, and lands on the cloned canvas.
 * The server-side copy is jump-cut.
 */
const clip: Clip = {
  name: "dashboard/community-remix",
  url: "/dashboard/community",
  actions: async ({ page, h }) => {
    const templatesTab = page.getByRole("tab", { name: "Templates" });
    await templatesTab.waitFor({ state: "visible" });
    await h.beat(600);

    // Browse into the Templates tab.
    await h.click(templatesTab);
    const card = page.getByRole("button", { name: "Preview TNF - Outfit Try-Ons" });
    await card.waitFor({ state: "attached", timeout: 15_000 });
    await h.beat(800);

    // Drift down the masonry until the card is comfortably in view.
    for (let i = 0; i < 8; i++) {
      const box = await card.boundingBox();
      if (box && box.y > 100 && box.y < 420) break;
      await h.scroll(300);
      await h.beat(250);
    }
    await h.beat(500);
    await h.click(card);

    // Detail modal: preview canvas + Remix rail.
    const remix = page.getByRole("button", { name: "Remix" }).first();
    await remix.waitFor({ state: "visible", timeout: 15_000 });
    await h.beat(1300);

    // Remix → pick the destination workspace → server-side copy → land in
    // the editor (jump-cut the wait).
    await h.click(remix);
    const wsOption = page.getByText("Flowy Docs's Workspace", { exact: true }).last();
    if (await wsOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      await h.beat(500);
      await h.click(wsOption);
    }
    await h.skip(async () => {
      await page.waitForURL(/\/editor\/[^/]+\/canvas/, { timeout: 180_000 });
      // Wait for the editor chrome AND cloned canvas content — no boot
      // loader, no empty canvas. Strict: a timeout fails the take.
      await page
        .getByRole("button", { name: "Add a node" })
        .waitFor({ state: "visible", timeout: 120_000 });
      await page
        .getByRole("button", { name: "Node options" })
        .first()
        .waitFor({ state: "visible", timeout: 120_000 });
      await page.waitForTimeout(1500);
    });
    // The remixed canvas, fully ours.
    await h.beat(1600);
  },
};

export default clip;
