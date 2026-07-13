import type { Clip } from "../../lib/runner.ts";

const clip: Clip = {
  name: "settings/account",
  url: "/dashboard/account",
  actions: async ({ page, h }) => {
    // General: profile details
    await page.getByRole("heading", { name: "Profile" }).waitFor({ state: "visible" });
    await h.moveTo(page.getByRole("button", { name: "Change profile picture" }));
    await h.beat(600);
    await h.moveTo(page.getByRole("textbox", { name: "First name" }));
    await h.beat(500);

    // Security: sign-in email + active sessions
    await h.click(page.getByRole("link", { name: "Security" }));
    await page.getByRole("heading", { name: "Active sessions" }).waitFor({ state: "visible" });
    await h.beat(400);
    await h.moveTo(page.getByText("Current session").first());
    await h.beat(700);
    await h.moveTo(page.getByRole("button", { name: "Sign out of all other devices" }));
    await h.beat(500);

    // Notifications: the channel matrix
    await h.click(page.getByRole("link", { name: "Notifications" }).first());
    await page.getByRole("checkbox", { name: "Workspace invites — In-app" }).waitFor({ state: "visible" });
    await h.beat(400);
    await h.moveTo(page.getByRole("checkbox", { name: "Project invites — Email" }));
    await h.beat(500);
    await h.scroll(320);
    await h.beat(500);

    // Preferences: project defaults
    await h.click(page.getByRole("link", { name: "Preferences" }));
    await page.getByRole("switch", { name: "Show credit balance" }).waitFor({ state: "visible" });
    await h.beat(400);
    await h.moveTo(page.getByRole("switch", { name: "Performance mode" }));
    await h.beat(500);
    await h.scroll(300);
    await h.moveTo(page.getByRole("switch", { name: "In-app pop-ups" }));
    await h.beat(600);
  },
};

export default clip;
