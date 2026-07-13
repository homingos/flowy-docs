import type { Clip } from "../../lib/runner.ts";

// Busy seeded canvas: "masai maara (Remix)".
const PROJECT = "6a4adad69a876dea0d2d112e";

const clip: Clip = {
  name: "canvas/toolbar",
  url: `/editor/${PROJECT}/canvas`,
  crf: 26,
  speed: 1.25,
  actions: async ({ page, h }) => {
    await page.locator(".react-flow__node").first().waitFor({ state: "visible", timeout: 30_000 });
    await h.beat(800);
    await page.keyboard.press("Shift+Digit1");
    await h.beat(1300);
    h.mark();

    // Top of the rail: the add-node menu.
    await h.click(page.getByRole("button", { name: "Add a node" }));
    await h.beat(400);
    const menu = page.locator('[aria-label="Node selection"]');
    await h.moveTo(menu.getByRole("button", { name: /^Text/ }));
    await h.beat(300);
    await h.moveTo(menu.getByRole("button", { name: /^Video/ }));
    await h.beat(300);
    // Libraries live at the bottom of the menu.
    await h.moveTo(menu.getByRole("button", { name: /^Upload/ }));
    await h.beat(400);
    await h.scroll(120);
    await h.moveTo(menu.getByRole("button", { name: /^Asset Library/ }));
    await h.beat(450);
    await h.click(page.getByRole("button", { name: "Close menu" }));
    await h.beat(300);

    // Pointer tools, top to bottom.
    for (const name of ["Select", "Pan", "Cut connection", "Sticky note", "Group"]) {
      await h.moveTo(page.getByRole("button", { name, exact: true }));
      await h.beat(320);
    }
    // History.
    await h.moveTo(page.getByRole("button", { name: "Undo" }));
    await h.beat(300);
    await h.moveTo(page.getByRole("button", { name: "Redo" }));
    await h.beat(350);

    // Zoom into an empty patch so the note is readable.
    await h.moveTo({ x: 420, y: 300 });
    await page.keyboard.down("Meta");
    for (let i = 0; i < 6; i++) {
      await page.mouse.wheel(0, -120);
      await page.waitForTimeout(140);
    }
    await page.keyboard.up("Meta");
    await h.beat(400);

    // Drop a sticky note and write on it.
    await h.click(page.getByRole("button", { name: "Sticky note" }));
    await h.beat(300);
    await h.click({ x: 450, y: 320 });
    await h.beat(450);
    // Click into the note so the editor takes focus, then type.
    await h.click({ x: 450, y: 320 });
    await page.waitForFunction(() => (document.activeElement as HTMLElement | null)?.isContentEditable ?? false, undefined, { timeout: 3000 }).catch(() => {});
    await page.keyboard.type("Ship it 🚀", { delay: 55 });
    await h.beat(700);
    await h.click({ x: 300, y: 620 });
    await h.beat(450);

    // Undo puts the canvas back the way it was.
    const undoBtn = page.getByRole("button", { name: "Undo" });
    for (let i = 0; i < 4; i++) {
      const stickies = await page.locator(".react-flow__node-stickyNote").count();
      if (stickies === 0) break;
      await h.click(undoBtn);
      await h.beat(450);
    }
    await page.keyboard.press("Shift+Digit1");
    await h.beat(1000);
  },
};

export default clip;
