import type { Clip } from "../../lib/runner.ts";

/**
 * dashboard/projects.mdx — "Creating a project, marking a favorite, and
 * restoring one from Trash".
 *
 * Everything destructive happens to the project created inside this clip —
 * seeded projects are never trashed. Trash/restore commits are deferred
 * behind a ~3s undo toast, so those waits are jump-cut.
 */
const clip: Clip = {
  name: "dashboard/projects",
  url: "/dashboard/projects/all",
  speed: 1.35,
  actions: async ({ page, h, baseUrl }) => {
    const createBtn = page.getByRole("button", { name: "Create a new project" });
    await createBtn.waitFor({ state: "visible" });
    const seeded = new Set(
      await page.locator("a[href^='/editor/']").evaluateAll((els) =>
        els.map((el) => el.getAttribute("href")),
      ),
    );
    await h.beat(400);

    // Create a project from the grid's create card.
    await h.click(createBtn);
    await page.getByRole("button", { name: "Start creating" }).waitFor({ state: "visible" });
    await h.beat(500);
    await h.click(page.getByRole("button", { name: "Start creating" }));
    await h.skip(async () => {
      await page.waitForURL(/\/editor\//, { timeout: 60_000 });
      // Land on real canvas UI, not the boot loader.
      await page
        .getByRole("button", { name: "Skip for now" })
        .waitFor({ state: "visible", timeout: 30_000 })
        .catch(() => {});
      await page.waitForTimeout(600);
    });
    // Straight into the canvas — linger a moment.
    await h.beat(900);

    // Back to the grid: pick out the freshly created card.
    await h.skip(async () => {
      await page.goto(`${baseUrl}/dashboard/projects/all`, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle").catch(() => {});
      await createBtn.waitFor({ state: "visible" });
      await page.waitForTimeout(900);
    });
    const hrefs = await page
      .locator("a[href^='/editor/']")
      .evaluateAll((els) => els.map((el) => el.getAttribute("href")));
    const newHref = hrefs.find((hrf) => hrf && !seeded.has(hrf));
    if (!newHref) throw new Error("new project card not found");
    const newCard = page.locator(`a[href="${newHref}"]`).first();
    await newCard.waitFor({ state: "visible" });
    await h.beat(350);

    // Favorite it, then peek at the Favorites view.
    await h.moveTo(newCard);
    await h.beat(250);
    await h.click(newCard.getByRole("button", { name: "Add to favorites" }));
    await h.beat(350);
    await h.click(page.getByRole("button", { name: "Show favorites only" }));
    await h.beat(800);
    await h.click(page.getByRole("button", { name: "Show all projects" }));
    await h.beat(300);

    // Trash the project we just made (menu shows Rename/Duplicate/Trash)…
    await h.moveTo(newCard);
    await h.beat(250);
    await h.click(newCard.getByRole("button", { name: "More options" }));
    await page.getByRole("menuitem", { name: "Move to trash" }).waitFor({ state: "visible" });
    await h.beat(450);
    await h.click(page.getByRole("menuitem", { name: "Move to trash" }));
    await h.beat(400);

    // …find it in Trash (the deferred commit takes ~3s — jump-cut it)…
    await h.click(page.getByRole("link", { name: "Trash" }));
    const trashCard = page.locator("a").filter({ has: page.locator("h3") }).first();
    await h.skip(async () => {
      await trashCard.waitFor({ state: "visible", timeout: 20_000 });
      await page.waitForTimeout(400);
    });
    await h.beat(400);

    // …and restore it.
    await h.moveTo(trashCard);
    await h.beat(250);
    await h.click(trashCard.getByRole("button", { name: "More options" }));
    await page.getByRole("menuitem", { name: "Restore" }).waitFor({ state: "visible" });
    await h.beat(400);
    await h.click(page.getByRole("menuitem", { name: "Restore" }));
    // Stay put (undo toast showing) while the restore commits.
    await h.beat(700);
    await h.skip(async () => {
      await page.waitForTimeout(3200);
    });

    // Back on All, good as new. The client grid doesn't reseed itself after
    // the deferred commit, so reload for real inside a jump-cut.
    await h.click(page.getByRole("link", { name: "All projects" }));
    await h.skip(async () => {
      await page.goto(`${baseUrl}/dashboard/projects/all`, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle").catch(() => {});
      await newCard.waitFor({ state: "visible", timeout: 30_000 });
      await page.waitForTimeout(600);
    });
    await h.beat(800);
  },
};

export default clip;
