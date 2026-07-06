import type { Clip } from "../../lib/runner.ts";

// Empty seeded canvas: "Untitled (Remix)" — clean stage for building a flow.
const PROJECT = "6a4ada4b9a876dea0d2d1126";

const clip: Clip = {
  name: "canvas/nodes-connect",
  url: `/editor/${PROJECT}/canvas`,
  crf: 26,
  actions: async ({ page, h }) => {
    // Dismiss the first-run overlay before the visible clip starts.
    const skip = page.getByRole("button", { name: "Skip for now" });
    if (await skip.isVisible({ timeout: 8000 }).catch(() => false)) {
      await h.click(skip);
      await h.beat(700);
    }
    await h.moveTo({ x: 640, y: 400 });
    await h.beat(600);
    h.mark();

    // Add a Text node from the add-node menu.
    await h.click(page.getByRole("button", { name: "Add a node" }));
    await h.beat(500);
    const menu = page.locator('[aria-label="Node selection"]');
    await h.click(menu.getByRole("button", { name: /^Text/ }));
    await page.locator(".react-flow__node-textBlock").first().waitFor({ state: "visible", timeout: 8000 });
    await h.beat(500);

    // The new node focuses its editor — write the prompt.
    await page.keyboard.type("A misty forest at dawn", { delay: 45 });
    await h.beat(700);

    // Click away, then add an Image node the same way.
    await h.click({ x: 1020, y: 240 });
    await h.beat(400);
    await h.click(page.getByRole("button", { name: "Add a node" }));
    await h.beat(500);
    await h.click(menu.getByRole("button", { name: /^Image/ }));
    await page.locator(".react-flow__node-emptyImageBlock").first().waitFor({ state: "visible", timeout: 8000 });
    await h.beat(600);

    // Frame both nodes.
    await page.keyboard.press("Shift+Digit1");
    await h.beat(1200);
    await h.click({ x: 350, y: 650 });
    await h.beat(500);

    // Wire them: drag from the Text node's output to the Image node's input.
    const src = page.locator(".react-flow__node-textBlock .react-flow__handle.source").first();
    const dst = page.locator(".react-flow__node-emptyImageBlock .react-flow__handle.target").first();
    await h.drag(src, dst);
    await h.beat(600);

    // Rest on the wired-up pair. (The seeded canvas is reset out-of-band.)
    await h.moveTo({ x: 500, y: 560 });
    await h.beat(1200);
  },
};

export default clip;
