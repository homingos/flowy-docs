import type { Clip } from "../../lib/runner.ts";

/**
 * billing/credits.mdx — "Checking the balance and buying credits from
 * Settings → Billing".
 *
 * The demo workspace is on the genuine Free plan, where the FE routes "Buy
 * credits" to the plans page instead of the top-up dialog. Flip `is_custom`
 * in the subscription response (display-only, no backend change) so the real
 * CreditPurchaseDialog opens with live packs. We hover — never click —
 * "Continue to checkout".
 */
const clip: Clip = {
  name: "help/topup",
  url: "/dashboard/settings/billing",
  actions: async ({ page, h, context }) => {
    await context.route("**/api/subscriptions/current*", async (route) => {
      const response = await route.fetch();
      const json = await response.json();
      json.is_custom = true;
      await route.fulfill({ response, json });
    });
    // Reload so the subscription is re-fetched through the intercept.
    await h.skip(async () => {
      await page.goto(page.url(), { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.getByRole("button", { name: "Buy credits" }).waitFor({ state: "visible" });
      await page.mouse.move(640, 400, { steps: 2 });
      await h.beat(800);
    });
    h.mark();

    // Check the balance, then open the top-up dialog.
    await h.moveTo(page.getByText("available").first());
    await h.beat(800);
    await h.click(page.getByRole("button", { name: "Buy credits" }));

    const dialog = page.getByRole("dialog", { name: "Buy credits" });
    await dialog.waitFor({ state: "visible", timeout: 10_000 });
    // Credit packs load from the backend — jump-cut any slow fetch.
    await h.skip(async () => {
      await dialog
        .getByRole("button", { name: /^\$50 / })
        .waitFor({ state: "visible", timeout: 30_000 });
    });
    await h.beat(900);

    // Compare packs, pick $50, glance at the total, hover the confirm
    // (no click!).
    await h.moveTo(dialog.getByRole("button", { name: /^\$10 / }));
    await h.beat(400);
    await h.click(dialog.getByRole("button", { name: /^\$50 / }));
    await h.beat(600);
    await h.moveTo(dialog.getByText("Total"));
    await h.beat(500);
    await h.moveTo(dialog.getByRole("button", { name: "Continue to checkout" }));
    await h.beat(1300);

    // Close without buying.
    await h.click(dialog.getByRole("button", { name: "Close" }));
    await h.beat(500);
  },
};

export default clip;
