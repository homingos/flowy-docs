import type { Clip } from "../../lib/runner.ts";

const clip: Clip = {
  name: "settings/api-keys",
  url: "/dashboard/settings/api-keys",
  actions: async ({ page, h, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    // Start a new key.
    await h.click(page.getByRole("button", { name: "Create API key" }));
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("heading", { name: "Create new API key" }).waitFor({ state: "visible" });
    await h.beat(400);

    // Name it.
    await h.type(dialog.getByRole("textbox", { name: "Name" }), "docs-demo", 55);
    await h.beat(400);

    // Choose the Read Only preset.
    await h.click(dialog.getByRole("tab", { name: "Read Only" }));
    await h.beat(700);

    // Create it.
    await h.click(dialog.getByRole("button", { name: "Create API key" }));

    // The secret is shown once — pause on it, then copy.
    const reveal = page.getByRole("dialog");
    await reveal.getByRole("heading", { name: "API key created" }).waitFor({ state: "visible", timeout: 15_000 });
    await h.beat(800);
    await h.moveTo(reveal.getByText(/^flowy_/).first());
    await h.beat(700);

    // Surface the secret for post-recording traffic generation.
    const secret = await page
      .evaluate(() => {
        const dlg = document.querySelector('[role="dialog"]');
        if (!dlg) return null;
        const m = (dlg as HTMLElement).innerText.match(/flowy_[A-Za-z0-9_\-]{20,}/);
        return m ? m[0] : null;
      })
      .catch(() => null);
    console.log("DOCS_DEMO_KEY=" + secret);

    await h.click(reveal.getByRole("button", { name: "Copy" }));
    await h.beat(800);

    // Close and see it in the list.
    await h.click(reveal.getByRole("button", { name: "Done" }));
    await page.getByText("docs-demo").first().waitFor({ state: "visible" });
    await h.beat(500);
    await h.moveTo(page.getByText("docs-demo").first());
    await h.beat(900);
  },
};

export default clip;
