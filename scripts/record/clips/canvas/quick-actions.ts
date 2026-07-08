import type { Clip } from "../../lib/runner.ts";

// Busy seeded canvas: "masai maara (Remix)". Additive only — the variants
// build adds nodes; nothing is deleted and no generation is confirmed.
const PROJECT = "6a4adad69a876dea0d2d112e";

const clip: Clip = {
  name: "canvas/quick-actions",
  url: `/editor/${PROJECT}/canvas`,
  size: [1920, 1080],
  actions: async ({ page, h }) => {
    await page.getByRole("button", { name: "Skip for now" }).click({ timeout: 4000 }).catch(() => {});
    await page.locator(".react-flow__node").first().waitFor({ state: "visible", timeout: 30_000 });
    await h.beat(800);
    // Reset to a clean thread (previous takes leave pending plans behind),
    // then close the panel again — all before the visible clip starts.
    await page.getByRole("button", { name: "Open Flowy chat" }).click();
    await page
      .getByRole("textbox", { name: "Ask Flowy to build, wire, or generate…" })
      .waitFor({ state: "visible", timeout: 15_000 });
    await page.getByRole("button", { name: "New chat" }).click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(800);
    await page.getByRole("button", { name: "Close Flowy chat" }).click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(600);
    await page.keyboard.press("Shift+Digit1");
    await h.beat(1200);
    h.mark();

    // Open the dock — with nothing selected the chips read the whole board.
    await h.click(page.getByRole("button", { name: "Open Flowy AI" }));
    await page.getByRole("button", { name: "Audit canvas" }).waitFor({ state: "visible", timeout: 8000 });
    await h.beat(700);
    await h.moveTo(page.getByRole("button", { name: "Audit canvas" }));
    await h.beat(800);
    await h.moveTo(page.getByRole("button", { name: "Organize flow" }));
    await h.beat(1000);

    // Select an image node — the chips switch to image moves.
    const imgNode = page
      .locator(".react-flow__node-staticImageBlock")
      .filter({ has: page.locator("img[alt='Generated result']") })
      .first();
    await h.click(imgNode);
    await page.getByRole("button", { name: "Image variants" }).waitFor({ state: "visible", timeout: 8000 });
    await h.beat(800);
    await h.moveTo(page.getByRole("button", { name: "Animate image" }));
    await h.beat(800);
    await h.moveTo(page.getByRole("button", { name: "Add storyboard" }));
    await h.beat(1000);

    // Fire one — the chip stages its prompt in the chat composer. The chips
    // are icon dots that expand on hover, so settle the hover before clicking.
    const before = await page.locator(".react-flow__node").count();
    const chip = page.getByRole("button", { name: "Image variants" });
    await h.moveTo(chip);
    await h.beat(900);
    await h.click(chip);
    // The chat panel opens with the prompt staged — send it.
    const panelComposer = page.getByRole("textbox", { name: "Ask Flowy to build, wire, or generate…" });
    await panelComposer.waitFor({ state: "visible", timeout: 10_000 });
    await h.beat(1200);
    await h.click(panelComposer);
    await page.keyboard.press("Enter");
    // The assistant either proposes a plan (approve it) or builds directly.
    const approve = page.getByRole("button", { name: "Approve & build" });
    const newNode = page.locator(".react-flow__node").nth(before);
    await h.skip(async () => {
      await Promise.race([
        approve.waitFor({ state: "visible", timeout: 240_000 }),
        newNode.waitFor({ state: "visible", timeout: 240_000 }),
      ]);
      await page.waitForTimeout(800);
    });
    if (await approve.isVisible().catch(() => false)) {
      await approve.scrollIntoViewIfNeeded();
      await h.beat(1000);
      await h.click(approve);
      await h.skip(async () => {
        // The variant nodes land on the canvas.
        await newNode.waitFor({ state: "visible", timeout: 240_000 });
        await page.waitForTimeout(1500);
      });
    }
    await h.beat(1200);
    await page.keyboard.press("Shift+Digit2"); // frame the selection/new work
    await h.beat(600);
    await page.keyboard.press("Shift+Digit1");
    await h.beat(2400);
  },
};

export default clip;
