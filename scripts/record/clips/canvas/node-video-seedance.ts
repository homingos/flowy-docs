import type { Clip } from "../../lib/runner.ts";

// "masai maara (Remix)" — the assistant pre-wired "Dawn Drift": two savanna
// stills connected as first/last frames on a Default-engine node. (The older
// Sunrise Sweep / Dawn to Dusk nodes have permanently stuck "Generating…"
// labels — generations that finish with no client attached never clear.)
const PROJECT = "6a4adad69a876dea0d2d112e";
const NODE_ID = "video_09278dcb91c042d09b98c9aad7183119";

const clip: Clip = {
  name: "canvas/node-video-seedance",
  url: `/editor/${PROJECT}/canvas`,
  size: [1920, 1080],
  actions: async ({ page, h }) => {
    await page.getByRole("button", { name: "Skip for now" }).click({ timeout: 4000 }).catch(() => {});
    await page.locator(".react-flow__node").first().waitFor({ state: "visible", timeout: 30_000 });
    await h.beat(800);
    const node = page.locator(`.react-flow__node[data-id="${NODE_ID}"]`);
    let box = await node.boundingBox();
    if (!box) {
      await page.keyboard.press("Shift+Digit1");
      await h.beat(800);
      box = await node.boundingBox();
    }
    if (!box) throw new Error("Dawn Drift node not found");
    // Tight framing on the node — keeps neighbouring nodes out of shot.
    await page.mouse.click(box.x + box.width * 0.4, box.y + 6);
    await page.waitForTimeout(500);
    await page.keyboard.press("Shift+Digit2");
    await h.beat(900);
    h.mark();

    // Select the node — settings on the right.
    box = await node.boundingBox();
    if (!box) throw new Error("node left view");
    await h.click({ x: box.x + box.width * 0.4, y: box.y + 8 });
    await h.beat(1200);

    // Walk the settings: duration, aspect ratio, resolution.
    for (const name of ["Duration", "Aspect ratio", "Resolution"]) {
      const combo = page.getByRole("combobox", { name });
      if (await combo.isVisible().catch(() => false)) {
        await h.moveTo(combo);
        await h.beat(650);
      }
    }

    // Re-run the first-to-last-frame generation.
    box = await node.boundingBox();
    if (!box) throw new Error("node left view before run");
    const prevSrc = await node.locator("video").first().getAttribute("src").catch(() => null);
    await h.moveTo({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
    await h.beat(900);
    const regen = node.getByRole("button", { name: /Regenerate/ }).first();
    if (await regen.isVisible().catch(() => false)) {
      await h.click(regen);
    } else {
      const generate = node.getByRole("button", { name: "Generate" });
      await h.click(generate);
    }
    await h.skip(async () => {
      await page.waitForFunction(
        ([nid, old]) => {
          const v = document.querySelector(`.react-flow__node[data-id="${nid}"] video`);
          const src = v?.getAttribute("src");
          return Boolean(src) && src !== old;
        },
        [NODE_ID, prevSrc] as [string, string | null],
        // Dev-backend video generations regularly take 10-30 minutes.
        { timeout: 1_800_000 },
      );
      await page.waitForTimeout(3000);
    });
    // Rest on the finished clip playing first-to-last.
    const done = await node.boundingBox();
    if (done) await h.moveTo({ x: done.x + done.width / 2, y: done.y + done.height / 2 });
    await h.beat(4200);
  },
};

export default clip;
