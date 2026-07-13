import type { Clip } from "../../lib/runner.ts";

const clip: Clip = {
  name: "settings/logs",
  url: "/dashboard/settings/logs",
  actions: async ({ page, h }) => {
    // The request table: a mix of 200s and 400s.
    await page.getByRole("button", { name: "Filter", exact: true }).waitFor({ state: "visible" });
    await h.beat(500);
    await h.moveTo(page.getByRole("button", { name: /nonexistent-app-id.*400/ }).first());
    await h.beat(700);

    // Filter by status code.
    await h.click(page.getByRole("button", { name: "Filter", exact: true }));
    await page.getByRole("option", { name: "Status" }).waitFor({ state: "visible" });
    await h.beat(400);
    await h.click(page.getByRole("option", { name: "Status" }));
    await page.getByRole("option", { name: "400", exact: true }).waitFor({ state: "visible" });
    await h.beat(500);
    await h.moveTo(page.getByRole("option", { name: "200", exact: true }));
    await h.beat(400);
    await h.click(page.getByRole("option", { name: "400", exact: true }));

    // Table now shows just the failed requests.
    const row = page.getByRole("button", { name: /nonexistent-app-id.*Filter by status/ }).first();
    await row.waitFor({ state: "visible", timeout: 10_000 });
    await h.beat(900);

    // Open a request's detail view — click the right side of the row (Time
    // column) to avoid the inline filter shortcuts on the left.
    const box = await row.boundingBox();
    if (box) {
      await h.moveTo({ x: box.x + box.width * 0.82, y: box.y + box.height / 2 });
      await h.beat(200);
      await page.mouse.down();
      await page.waitForTimeout(90);
      await page.mouse.up();
    }
    await page.getByText("Response body").first().waitFor({ state: "visible", timeout: 10_000 });
    await h.beat(700);
    await h.moveTo(page.getByText("User-agent").first());
    await h.beat(600);
    await h.moveTo(page.getByText(/docs-demo/).first());
    await h.beat(900);
  },
};

export default clip;
