import type { Clip } from "../../lib/runner.ts";

// Busy seeded canvas: "masai maara (Remix)" — its Compositor node holds
// 10 clips + a soundtrack. Additive only: we wire one extra layer in.
const PROJECT = "6a4adad69a876dea0d2d112e";

const clip: Clip = {
  name: "canvas/node-composition",
  url: `/editor/${PROJECT}/canvas`,
  crf: 24,
  actions: async ({ page, h }) => {
    await page.getByRole("button", { name: "Skip for now" }).click({ timeout: 4000 }).catch(() => {});
    await page.locator(".react-flow__node").first().waitFor({ state: "visible", timeout: 30_000 });
    await h.beat(800);
    await page.keyboard.press("Shift+Digit1");
    await h.beat(1000);
    h.mark();

    // Glide into the Compositor with a cursor-centered zoom.
    const comp = page.locator(".react-flow__node-compositionBlock").first();
    const far = await comp.boundingBox();
    if (!far) throw new Error("no compositor node");
    await h.moveTo({ x: far.x + far.width / 2, y: far.y + far.height / 2 });
    await h.beat(400);
    // Zoom until the node reads comfortably (~1/3 of the viewport wide).
    await page.keyboard.down("Meta");
    for (let i = 0; i < 14; i++) {
      const b = await comp.boundingBox();
      if (!b || b.width > 330) break;
      await page.mouse.wheel(0, -120);
      await page.waitForTimeout(160);
    }
    await page.keyboard.up("Meta");
    await h.beat(1200);

    const cBox = await comp.boundingBox();
    if (!cBox) throw new Error("compositor left view");
    // Select it via the header strip, clear of any inner buttons.
    await h.click({ x: cBox.x + cBox.width * 0.35, y: cBox.y + 8 });
    await h.beat(1000);

    // Wire one more upstream clip in if a neighbor is on screen.
    const neighbor = await page.evaluate(() => {
      const compEl = document.querySelector(".react-flow__node-compositionBlock");
      const cb = compEl?.getBoundingClientRect();
      if (!cb) return null;
      let best: { x: number; y: number; w: number; h: number } | null = null;
      let bestDx = Infinity;
      for (const el of Array.from(document.querySelectorAll(".react-flow__node"))) {
        if (el === compEl) continue;
        const r = el.getBoundingClientRect();
        const dx = cb.left - (r.left + r.width);
        if (dx > 40 && r.left > 0 && r.top > 80 && r.top + r.height < 760 && dx < bestDx) {
          best = { x: r.left, y: r.top, w: r.width, h: r.height };
          bestDx = dx;
        }
      }
      return best;
    });
    if (neighbor) {
      await h.drag(
        { x: neighbor.x + neighbor.w + 14, y: neighbor.y + neighbor.h / 2 + 12 },
        { x: cBox.x - 10, y: cBox.y + cBox.height / 2 },
      );
      await h.beat(1400);
    }

    // Browse the layered contents, then hand off to Studio.
    await h.moveTo({ x: cBox.x + cBox.width / 2, y: cBox.y + cBox.height * 0.45 });
    await h.beat(1400);
    const open = page.getByRole("button", { name: "Open in Studio" });
    await h.click(open);
    await h.skip(async () => {
      await page.getByPlaceholder("Search clips...").waitFor({ state: "visible", timeout: 60_000 }).catch(async () => {
        await page.getByRole("tab", { name: "Studio" }).waitFor({ state: "visible", timeout: 30_000 }).catch(() => {});
      });
      await page.waitForTimeout(2000);
    });
    await h.beat(2400);
  },
};

export default clip;
