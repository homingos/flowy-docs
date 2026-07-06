import type { Clip } from "../../lib/runner.ts";

const clip: Clip = {
  name: "collab/sharing",
  url: "/editor/6a4adad69a876dea0d2d112e/canvas",
  actions: async ({ page, h, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    // Let the canvas render, then open the Share dialog from the header.
    const share = page.getByRole("button", { name: "Share project" });
    await share.waitFor({ state: "visible" });
    await h.beat(700);
    await h.click(share);

    // The dialog: invite box, who has access, link controls.
    const emailBox = page.getByRole("textbox", { name: "email@company.com" });
    await emailBox.waitFor({ state: "visible" });
    await h.beat(500);
    await h.moveTo(emailBox);
    await h.beat(600);
    await h.moveTo(page.getByText("Everyone in this workspace has access"));
    await h.beat(700);

    // Link access: switch to "Anyone with the link".
    await h.click(page.getByRole("button", { name: /Only people with access/ }));
    const anyone = page.getByRole("menu").getByRole("button", { name: "Anyone with the link" });
    await anyone.waitFor({ state: "visible" });
    await h.beat(500);
    await h.click(anyone);
    await page
      .getByRole("button", { name: /Anyone with the link/ })
      .waitFor({ state: "visible", timeout: 10_000 });
    await h.beat(900);

    // Copy the public link.
    await h.click(page.getByRole("button", { name: "Copy link" }));
    await h.beat(900);

    // Close the dialog by clicking back on the canvas.
    await h.click({ x: 300, y: 420 });
    await h.beat(800);
  },
};

export default clip;
