import type { Clip } from "../../lib/runner.ts";

const clip: Clip = {
  name: "collab/roles",
  url: "/dashboard/settings/members",
  actions: async ({ page, h }) => {
    // The roster: each member row carries a role badge.
    await page.getByRole("button", { name: "Invite" }).waitFor({ state: "visible" });
    await h.moveTo(page.getByText("claude-user-3@flamapp.com").first());
    await h.beat(700);
    await h.moveTo(page.getByText("Owner", { exact: true }).first());
    await h.beat(800);

    // Filter the roster by role — the three roles Flowy uses everywhere.
    await h.click(page.getByRole("button", { name: "All" }));
    await page.getByRole("menuitem", { name: "Editors" }).waitFor({ state: "visible" });
    await h.beat(400);
    await h.moveTo(page.getByRole("menuitem", { name: "Owners" }));
    await h.beat(500);
    await h.moveTo(page.getByRole("menuitem", { name: "Editors" }));
    await h.beat(500);
    await h.moveTo(page.getByRole("menuitem", { name: "Viewers" }));
    await h.beat(500);
    await h.click(page.getByRole("menuitem", { name: "All" }));
    await h.beat(400);

    // Invite — at the seat cap this opens the plan picker instead of the form.
    await h.click(page.getByRole("button", { name: "Invite" }));
    await page.getByRole("heading", { name: "Plans" }).waitFor({ state: "visible", timeout: 15_000 });
    await h.beat(600);
    await h.moveTo(page.getByText("You've used every seat on your plan", { exact: false }));
    await h.beat(900);
    await h.moveTo(page.getByText("Up to 5 seats").first());
    await h.beat(600);
    await h.moveTo(page.getByText("Up to 20 seats").first());
    await h.beat(700);

    // Back to the roster.
    await h.click(page.getByRole("link", { name: "Members" }));
    await page.getByRole("button", { name: "Invite" }).waitFor({ state: "visible" });
    await h.beat(800);
  },
};

export default clip;
