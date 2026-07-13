import type { Clip } from "../../lib/runner.ts";

const clip: Clip = {
  name: "dashboard/overview",
  url: "/dashboard",
  actions: async ({ page, h }) => {
    await page.getByRole("link", { name: "Projects" }).waitFor({ state: "visible" });

    // Sweep down the sidebar nav, hovering the main areas.
    for (const label of ["Home", "Projects", "Brand Kit", "Assets", "Community"]) {
      const item = page.getByRole("link", { name: label }).first();
      if (await item.isVisible().catch(() => false)) {
        await h.moveTo(item);
        await h.beat(500);
      }
    }

    // Glide over the prompt box and quick-create actions.
    await h.moveTo(page.getByRole("textbox", { name: /Ask Flowy/i }));
    await h.beat(600);
    await h.moveTo(page.getByRole("button", { name: "New project" }));
    await h.beat(500);

    // Peek at the project tabs.
    const recent = page.getByRole("tab", { name: "Recently viewed" });
    if (await recent.isVisible().catch(() => false)) {
      await h.click(recent);
      await h.beat(600);
      await h.click(page.getByRole("tab", { name: "My projects" }));
    }
    await h.beat(400);
  },
};

export default clip;
