import { join } from "node:path";
import type { Clip } from "../../lib/runner.ts";

const HERO_PNG = join(
  import.meta.dirname,
  "..",
  "..",
  "..",
  "..",
  "images",
  "hero.png",
);

/**
 * dashboard/assets.mdx — "organizing assets and using them on the canvas".
 * Walkthrough: browse the library, create a "Brand shots" folder, upload
 * hero.png into it, then open a seeded canvas, pull the upload out of the
 * Asset Library, and place it as a node.
 */
const clip: Clip = {
  name: "dashboard/assets",
  url: "/dashboard/assets",
  size: [1920, 1080],
  actions: async ({ page, h, baseUrl }) => {
    const newFolderBtn = page.getByRole("button", { name: "New folder" }).first();
    await newFolderBtn.waitFor({ state: "visible" });
    await h.beat(1200);

    // Take in the library first: drift over the asset grid.
    const firstAsset = page.locator("[role=button][class*=group]").first();
    await h.moveTo(page.getByRole("button", { name: "Workspace" }).first());
    await h.beat(500);
    if (await firstAsset.isVisible().catch(() => false)) {
      await h.moveTo(firstAsset);
      await h.beat(700);
    }

    // Create a folder — the new card appears inline with an editable name.
    await h.click(newFolderBtn);
    await page.locator("input, textarea").first().waitFor({ state: "visible", timeout: 5000 });
    await h.beat(500);
    await page.keyboard.type("Brand shots", { delay: 110 });
    await h.beat(700);
    await page.keyboard.press("Enter");
    await h.beat(1300);

    // Step inside it.
    const folder = page.getByRole("button", { name: /Brand shots/ }).first();
    await folder.waitFor({ state: "visible", timeout: 10_000 });
    await h.click(folder);
    const emptyState = page.getByText("This folder is empty");
    if (!(await emptyState.isVisible({ timeout: 2500 }).catch(() => false))) {
      await h.click(folder); // first click only selected — open it
      await emptyState.waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
    }
    await h.beat(1200);

    // Upload hero.png into the folder we're viewing. Gesture at the Upload
    // button, then feed the hidden file input; jump-cut the upload wait.
    await h.moveTo(page.getByRole("button", { name: "Upload" }).first());
    await h.beat(700);
    const heroCard = page.getByRole("button", { name: /hero/i }).first();
    await h.skip(async () => {
      await page.locator("input[type=file]").first().setInputFiles(HERO_PNG);
      await heroCard.waitFor({ state: "visible", timeout: 90_000 });
      await page.waitForTimeout(800);
    });
    // Uploads land in the folder you're viewing — admire it a moment.
    await h.moveTo(heroCard);
    await h.beat(1600);

    // Over to a canvas: open a seeded project.
    await h.skip(async () => {
      await page.goto(`${baseUrl}/editor/6a4adad69a876dea0d2d112e/canvas`, {
        waitUntil: "domcontentloaded",
      });
      await page
        .getByRole("button", { name: "Add a node" })
        .waitFor({ state: "visible", timeout: 60_000 });
      // Let the collab doc + node media paint.
      await page.waitForTimeout(4500);
    });
    await h.beat(1000);

    // Wander across the canvas a little before reaching for the library.
    await page.mouse.move(1100, 500, { steps: 30 });
    await h.scroll(260, 65);
    await h.beat(900);

    // Open the Asset Library from the left toolbar's node menu. The menu is
    // a scrollable popover with the Libraries section below the fold, so
    // filter with its search box to surface the entry.
    await h.click(page.getByRole("button", { name: "Add a node" }));
    const search = page.getByPlaceholder(/Search nodes/i);
    await search.waitFor({ state: "visible", timeout: 10_000 });
    await h.beat(500);
    await h.type(search, "asset", 90);
    const libraryEntry = page.getByRole("button", { name: "Asset Library" });
    await libraryEntry.waitFor({ state: "visible", timeout: 5000 });
    await h.beat(600);
    await h.click(libraryEntry);

    const libraryDialog = page.getByRole("dialog", { name: "Asset library" });
    await libraryDialog.waitFor({ state: "visible", timeout: 10_000 });
    const libraryHero = libraryDialog.getByRole("button", { name: /hero/i }).first();
    await h.skip(async () => {
      await libraryHero.waitFor({ state: "visible", timeout: 30_000 });
    });
    await h.beat(1100);

    // Select the upload and drop it onto the canvas.
    await h.click(libraryHero);
    await h.beat(800);
    await h.click(page.getByRole("button", { name: "Add to Canvas" }));
    await libraryDialog.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => {});
    // The asset lands at the viewport centre as a node — let it breathe.
    await h.beat(1200);
    const placed = page.getByText("hero.png").first();
    if (await placed.isVisible().catch(() => false)) {
      await h.moveTo(placed);
    }
    await h.beat(1800);
  },
};

export default clip;
