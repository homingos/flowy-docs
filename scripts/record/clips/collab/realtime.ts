import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import type { Clip } from "../../lib/runner.ts";

// Busy seeded canvas: "masai maara (Remix)". Recorded from the owner's view
// while a second, unrecorded context drives "Ana Reyes" (Editor) — her state
// comes from .auth/collab.json (mint it with _setup-collab*.ts). Ana's edits
// are a node nudge that gets dragged back; nothing destructive.
const PROJECT = "6a4adad69a876dea0d2d112e";
const HERE = dirname(fileURLToPath(import.meta.url));
const COLLAB_STATE = join(HERE, "..", "..", ".auth", "collab.json");

const clip: Clip = {
  name: "collab/realtime",
  url: `/editor/${PROJECT}/canvas`,
  crf: 26,
  actions: async ({ page, h, browser }) => {
    if (!existsSync(COLLAB_STATE)) throw new Error(".auth/collab.json missing — run _setup-collab first");
    await page.getByRole("button", { name: "Skip for now" }).click({ timeout: 4000 }).catch(() => {});
    await page.locator(".react-flow__node").first().waitFor({ state: "visible", timeout: 30_000 });
    await page.keyboard.press("Shift+Digit1");
    await h.beat(800);

    // Bring Ana online in a second, unrecorded context.
    const collabContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      storageState: COLLAB_STATE,
      colorScheme: "dark",
    });
    const ana = await collabContext.newPage();
    try {
      await ana.goto(`http://localhost:3000/editor/${PROJECT}/canvas`, { waitUntil: "domcontentloaded" });
      await ana.getByRole("button", { name: "Not now" }).click({ timeout: 4000 }).catch(() => {});
      await ana.getByRole("button", { name: "Skip for now" }).click({ timeout: 4000 }).catch(() => {});
      await ana.locator(".react-flow__node").first().waitFor({ state: "visible", timeout: 45_000 });
      await ana.keyboard.press("Shift+Digit1");
      await ana.waitForTimeout(800);

      // Wiggle Ana's pointer so her cursor broadcasts, then wait for it to
      // land on the owner's canvas before the visible clip starts.
      await ana.mouse.move(700, 400, { steps: 10 });
      await ana.mouse.move(650, 430, { steps: 10 });
      await page.locator('[class*="cursorContainer"]').first().waitFor({ state: "visible", timeout: 20_000 });
      await h.beat(900);
      h.mark();

      // ── Live cursors: Ana sweeps across the board while we watch.
      await h.moveTo({ x: 320, y: 560 });
      await ana.mouse.move(880, 300, { steps: 45 });
      await ana.waitForTimeout(350);
      await ana.mouse.move(520, 480, { steps: 45 });
      await ana.waitForTimeout(350);
      await ana.mouse.move(700, 380, { steps: 40 });
      await h.beat(700);

      // …and simultaneous editing: she nudges a node, we see it move live.
      const anaNode = ana.locator(".react-flow__node-staticImageBlock").first();
      const nodeBox = await anaNode.boundingBox();
      if (nodeBox) {
        const grabX = nodeBox.x + nodeBox.width / 2;
        const grabY = nodeBox.y + 10;
        await ana.mouse.move(grabX, grabY, { steps: 20 });
        await ana.mouse.down();
        await ana.mouse.move(grabX + 110, grabY + 60, { steps: 35 });
        await ana.mouse.up();
        await h.beat(900);
        // Drag it back home so the seeded board stays tidy.
        await ana.mouse.move(grabX + 110, grabY + 60, { steps: 10 });
        await ana.mouse.down();
        await ana.mouse.move(grabX, grabY, { steps: 35 });
        await ana.mouse.up();
        await ana.keyboard.press("Escape");
        await h.beat(800);
      }

      // ── Presence: open the collaborators dropdown — Ana is "Active now".
      // Route around the node cluster so the cursor doesn't skim edges.
      await h.moveTo({ x: 1000, y: 600 });
      await h.click(page.getByRole("button", { name: "Collaborators" }));
      const dropdown = page.getByRole("dialog", { name: "Collaborators" });
      await dropdown.waitFor({ state: "visible", timeout: 10_000 });
      await h.beat(600);
      await h.moveTo(dropdown.getByText("Ana Reyes").first());
      await h.beat(900);

      // ── Follow mode: spotlight Ana and track her viewport.
      await h.click(dropdown.getByRole("button", { name: "Spotlight" }).first());
      await page.getByText(/Following Ana/i).first().waitFor({ state: "visible", timeout: 10_000 });
      await h.beat(700);

      // Ana zooms into the heart of the board; our recorded viewport follows.
      await ana.mouse.move(530, 300, { steps: 12 });
      await ana.keyboard.down("Meta");
      for (let i = 0; i < 4; i++) {
        await ana.mouse.wheel(0, -120);
        await ana.waitForTimeout(260);
      }
      await ana.keyboard.up("Meta");
      await h.beat(800);
      // …then drifts sideways across the nodes.
      for (let i = 0; i < 4; i++) {
        await ana.mouse.wheel(60, 0);
        await ana.waitForTimeout(140);
      }
      await h.beat(900);
      await ana.keyboard.press("Shift+Digit1");
      await h.beat(1200);

      // ── Stop following: take back control.
      await h.click(page.getByRole("button", { name: /Stop following/ }));
      await h.beat(500);
      await page.keyboard.press("Shift+Digit1");
      await h.beat(900);
    } finally {
      await collabContext.close().catch(() => {});
    }
  },
};

export default clip;
