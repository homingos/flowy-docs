import type { Clip } from "../../lib/runner.ts";

/**
 * billing/plans.mdx — "Opening the plans page and upgrading a workspace".
 * Billing overview → View plans → plan cards → hover Pro. Stops well before
 * any checkout step.
 */
const clip: Clip = {
  name: "help/upgrade",
  url: "/dashboard/settings/billing",
  actions: async ({ page, h }) => {
    const viewPlans = page.getByRole("button", { name: "View plans" });
    await viewPlans.waitFor({ state: "visible" });
    await h.beat(400);

    // Glance at the current plan line, then open the plans page.
    await h.moveTo(page.getByText("Pay as you go").first());
    await h.beat(500);
    await h.click(viewPlans);

    // Plans page: let the cards paint. (hasText is case-insensitive — "Pro"
    // would match "projects" — so filter on the exact card heading instead.)
    const cardFor = (name: string) =>
      page
        .getByRole("article")
        .filter({ has: page.getByRole("heading", { name, exact: true }) })
        .first();
    const pro = cardFor("Pro");
    await pro.waitFor({ state: "visible", timeout: 15_000 });
    await h.beat(900);

    // Note the billing-period toggle, then sweep Lite → Pro and settle on
    // Pro's trial button (hover only — no click!).
    await h.moveTo(page.getByRole("button", { name: /Yearly/ }));
    await h.beat(700);
    await h.moveTo(cardFor("Lite"));
    await h.beat(600);
    await h.moveTo(pro);
    await h.beat(800);
    await h.moveTo(pro.getByRole("button", { name: "Start 7-day trial" }));
    await h.beat(1400);

    // Peek at the comparison table below.
    await h.scroll(420);
    await h.beat(900);
  },
};

export default clip;
