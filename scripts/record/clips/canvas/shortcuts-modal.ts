import type { Clip } from "../../lib/runner.ts";

// Busy seeded canvas: "masai maara (Remix)".
const PROJECT = "6a4adad69a876dea0d2d112e";

const clip: Clip = {
  name: "canvas/shortcuts-modal",
  url: `/editor/${PROJECT}/canvas`,
  crf: 26,
  actions: async ({ page, h }) => {
    await page.locator(".react-flow__node").first().waitFor({ state: "visible", timeout: 30_000 });
    await h.beat(800);
    await page.keyboard.press("Shift+Digit1");
    await h.beat(1200);
    h.mark();

    // ⇧? opens the in-app shortcut reference.
    await page.keyboard.press("Shift+?");
    const dialog = page.getByRole("dialog", { name: "Keyboard shortcuts" });
    await dialog.waitFor({ state: "visible", timeout: 5000 });
    await h.beat(1200);

    // Scroll through its sections.
    await h.moveTo({ x: 640, y: 430 });
    await h.scroll(520, 90);
    await h.beat(700);
    await h.scroll(520, 90);
    await h.beat(700);
    await h.scroll(-300, 100);
    await h.beat(600);

    // Close it.
    await h.click(page.getByRole("button", { name: "Close keyboard shortcuts" }));
    await h.beat(700);

    // N opens the add-node menu at the cursor, straight from the keyboard.
    await h.moveTo({ x: 560, y: 330 });
    await h.beat(300);
    await page.keyboard.press("n");
    const menu = page.getByRole("dialog", { name: "Add a node" });
    await menu.waitFor({ state: "visible", timeout: 5000 });
    // The menu focuses its search box — clear any stray character.
    await page.keyboard.press("Backspace");
    await h.beat(900);
    await h.moveTo(menu.getByRole("button", { name: /^Image/ }));
    await h.beat(600);

    // Esc closes it again.
    await page.keyboard.press("Escape");
    await h.beat(700);
  },
};

export default clip;
