import type { Clip } from "../../lib/runner.ts";

// Fresh, isolated project created for the AI-chat clips ("Midnight Meadow").
// A skill ("Product brief starter") was seeded here so the library isn't empty.
const PROJECT = "6a4b7988514413fa84caca94";

const clip: Clip = {
  name: "canvas/ai-memory",
  url: `/editor/${PROJECT}/canvas`,
  crf: 24,
  actions: async ({ page, h }) => {
    await page.getByRole("button", { name: "Skip for now" }).click({ timeout: 4000 }).catch(() => {});
    await h.beat(600);

    // Open the chat panel from the bottom-left launcher and start a clean thread.
    await h.click(page.getByRole("button", { name: "Open Flowy chat" }));
    const composer = page.getByRole("textbox", { name: "Ask Flowy to build, wire, or generate…" });
    await composer.waitFor({ state: "visible", timeout: 15_000 });
    await page.getByRole("button", { name: "New chat" }).click({ timeout: 4000 }).catch(() => {});
    await h.beat(900);
    h.mark();

    // Save a durable preference — Flowy acknowledges and stores it as memory.
    await h.type(composer, "Remember: our brand accent color is teal", 55);
    await h.beat(400);
    await page.keyboard.press("Enter");
    await h.skip(async () => {
      await page.getByRole("button", { name: "Stop" }).waitFor({ state: "visible", timeout: 15_000 }).catch(() => {});
      await page.getByRole("button", { name: "Stop" }).waitFor({ state: "hidden", timeout: 120_000 }).catch(() => {});
      await page.waitForTimeout(1200);
    });
    await h.beat(1800);

    // Browse the Skills library behind the book icon in the panel header.
    await h.click(page.getByRole("button", { name: "Skill library" }));
    await h.beat(1200);
    // Rest on the seeded "Product brief starter" entry.
    await h.moveTo(page.getByText("Product brief starter").first());
    await h.beat(2200);
    await page.keyboard.press("Escape");
    await h.beat(600);
  },
};

export default clip;
