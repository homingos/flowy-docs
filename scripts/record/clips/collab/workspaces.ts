import type { Clip } from "../../lib/runner.ts";

const clip: Clip = {
  name: "collab/workspaces",
  url: "/dashboard",
  actions: async ({ page, h }) => {
    await page.getByRole("link", { name: "Projects" }).waitFor({ state: "visible" });

    // Open the workspace switcher from the sidebar rail.
    const switcher = page.getByRole("button", { name: /Flowy Docs's Workspace/ }).first();
    await h.click(switcher);
    await page.getByRole("button", { name: "Create workspace" }).waitFor({ state: "visible" });
    await h.beat(500);

    // Glance at the workspace list, then start the create flow.
    await h.moveTo(page.getByRole("dialog").getByRole("button", { name: /Flowy Docs's Workspace/ }).first());
    await h.beat(700);
    await h.click(page.getByRole("button", { name: "Create workspace" }));

    // Name the new workspace — the URL handle derives automatically.
    const nameBox = page.getByRole("textbox", { name: "Workspace name" });
    await nameBox.waitFor({ state: "visible" });
    await h.beat(400);
    await h.type(nameBox, "Docs Demo Team", 60);
    await h.beat(600);
    await h.click(page.getByRole("button", { name: "Create workspace" }));

    // Creation + redirect into the new workspace.
    await h.skip(async () => {
      await page
        .getByRole("button", { name: /Docs Demo Team/ })
        .first()
        .waitFor({ state: "visible", timeout: 30_000 });
      await page.waitForLoadState("networkidle").catch(() => {});
    });
    await h.beat(1200);

    // Switch back to the original workspace.
    await h.click(page.getByRole("button", { name: /Docs Demo Team/ }).first());
    const backBtn = page.getByRole("dialog").getByRole("button", { name: /Flowy Docs's Workspace/ }).first();
    await backBtn.waitFor({ state: "visible" });
    await h.beat(400);
    await h.click(backBtn);
    await h.skip(async () => {
      await page.getByRole("button", { name: /Flowy Docs's Workspace/ }).first().waitFor({ state: "visible", timeout: 20_000 });
      await page.waitForLoadState("networkidle").catch(() => {});
    });
    await h.beat(900);
  },
};

export default clip;
