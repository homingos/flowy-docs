import type { Clip } from "../../lib/runner.ts";

const clip: Clip = {
  name: "settings/workspace",
  url: "/dashboard/settings",
  actions: async ({ page, h }) => {
    // General: workspace identity fields (hover only — no edits)
    await page.getByRole("heading", { name: "General" }).waitFor({ state: "visible" });
    await h.moveTo(page.getByRole("button", { name: "Change workspace logo" }));
    await h.beat(700);
    await h.moveTo(page.getByRole("textbox", { name: "My workspace" }));
    await h.beat(700);
    await h.moveTo(page.getByRole("textbox", { name: "workspace", exact: true }));
    await h.beat(700);
    await h.moveTo(page.getByRole("textbox", { name: /Welcome to the team/ }));
    await h.beat(600);

    // Members: the roster
    await h.click(page.getByRole("link", { name: "Members" }));
    await page.getByRole("button", { name: "Invite" }).waitFor({ state: "visible" });
    await h.beat(500);
    await h.moveTo(page.getByText("claude-user-3@flamapp.com").first());
    await h.beat(900);
    await h.moveTo(page.getByRole("textbox", { name: "Search members" }));
    await h.beat(600);
    await h.moveTo(page.getByRole("button", { name: "All" }));
    await h.beat(600);
    await h.moveTo(page.getByRole("button", { name: "Export CSV" }));
    await h.beat(600);
    await h.moveTo(page.getByRole("button", { name: "Invite" }));
    await h.beat(900);
  },
};

export default clip;
