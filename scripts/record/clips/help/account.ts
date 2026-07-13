import { mintMagicLinkToken } from "../../lib/auth.ts";
import type { Clip } from "../../lib/runner.ts";

const EMAIL = "claude-user-3@flamapp.com";

/**
 * help/account.mdx — the sign-in surface and landing in a ready workspace.
 *
 * A signed-in session gets redirected off /auth/signin, so the clip drops the
 * context's cookies first, shows the provider buttons + magic-link email
 * entry, then completes a real magic-link sign-in (minted locally, same as
 * the auth harness) and lands on the dashboard.
 */
const clip: Clip = {
  name: "help/account",
  url: "/auth/signin",
  actions: async ({ page, h, context, baseUrl }) => {
    // Shed the signed-in session so the sign-in surface actually renders.
    await context.clearCookies();
    await page.goto(`${baseUrl}/auth/signin`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});
    await page
      .getByRole("button", { name: "Continue with Google" })
      .waitFor({ state: "visible", timeout: 15_000 });
    await page.mouse.move(640, 400, { steps: 2 });
    await h.beat(600);
    h.mark();

    // Glance across the provider options.
    await h.beat(500);
    await h.moveTo(page.getByRole("button", { name: "Continue with Google" }));
    await h.beat(450);
    await h.moveTo(page.getByRole("button", { name: "Continue with GitHub" }));
    await h.beat(350);
    await h.moveTo(page.getByRole("button", { name: "Continue with Figma" }));
    await h.beat(450);

    // Magic-link entry: reveal the email field and type an address.
    await h.click(page.getByRole("button", { name: "Sign in with email" }));
    const emailField = page.getByRole("textbox", { name: "Email" }).first();
    await emailField.waitFor({ state: "visible", timeout: 10_000 });
    await h.type(emailField, EMAIL, 40);
    await h.beat(700);

    // Complete the sign-in with a locally minted magic link (the same path
    // the emailed link takes) and land in the workspace.
    await h.skip(async () => {
      const token = mintMagicLinkToken(EMAIL);
      await page.goto(
        `${baseUrl}/auth/magic-link?token=${encodeURIComponent(token)}&callbackUrl=/dashboard`,
        { waitUntil: "domcontentloaded" },
      );
      await page.waitForURL((u) => /(^|\/)dashboard(\/|$)/.test(u.pathname), {
        timeout: 60_000,
      });
      await page.waitForLoadState("networkidle").catch(() => {});
      await page
        .getByRole("link", { name: "Projects" })
        .waitFor({ state: "visible", timeout: 15_000 })
        .catch(() => {});
      await page.waitForTimeout(600);
    });
    // Ready workspace.
    await h.beat(1400);
  },
};

export default clip;
