import type { Clip } from "../../lib/runner.ts";

const clip: Clip = {
  name: "settings/usage",
  url: "/dashboard/settings/usage",
  actions: async ({ page, h }) => {
    // Overview: the headline KPI tiles.
    await page.getByRole("tab", { name: "Overview" }).waitFor({ state: "visible" });
    await h.beat(400);
    await h.moveTo(page.getByText("Available", { exact: true }).first());
    await h.beat(600);
    await h.moveTo(page.getByText("Spent ·", { exact: false }).first());
    await h.beat(500);
    await h.moveTo(page.getByText("Generations", { exact: true }).first());
    await h.beat(600);

    // Activity heatmap.
    await h.moveTo(page.getByRole("img", { name: "Daily credit activity heatmap" }));
    await h.beat(800);

    // Breakdown panel: pivot control.
    await h.click(page.getByRole("tab", { name: "Breakdown" }));
    await page.getByText("Break down by").waitFor({ state: "visible" });
    await h.beat(500);
    await h.moveTo(page.getByRole("combobox").first());
    await h.beat(800);

    // History ledger.
    await h.click(page.getByRole("tab", { name: "History" }));
    await page.getByRole("tab", { name: "Received" }).waitFor({ state: "visible" });
    await h.beat(500);
    await h.moveTo(page.getByRole("tab", { name: "Received" }));
    await h.beat(500);
    await h.moveTo(page.getByText("Welcome credits").first());
    await h.beat(600);
    await h.moveTo(page.getByRole("button", { name: "Export CSV" }));
    await h.beat(800);
  },
};

export default clip;
