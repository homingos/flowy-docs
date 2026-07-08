/**
 * Setup (excluded from run.ts): invite claude-user-3+collab@flamapp.com as an
 * Editor on masai maara, sign that account in, and save its storage state to
 * .auth/collab.json for the realtime-collab clip.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { STATE_PATH, mintMagicLinkToken } from "../lib/auth.ts";
import { BASE_URL as BASE } from "../lib/env.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const COLLAB_STATE = join(HERE, "..", ".auth", "collab.json");
const SCRATCH = process.env.SCRATCH ?? "/tmp";
const EMAIL = "claude-user-3+collab@flamapp.com";
const PROJECT = "6a4adad69a876dea0d2d112e";

const browser = await chromium.launch({ headless: true });

// 1. As the owner: invite the collab account as Editor.
{
  const context = await browser.newContext({
    storageState: STATE_PATH,
    viewport: { width: 1280, height: 800 },
    colorScheme: "dark",
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/editor/${PROJECT}/canvas`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(4000);
  await page.getByRole("button", { name: "Skip for now" }).click({ force: true, timeout: 3000 }).catch(() => {});
  await page.getByRole("button", { name: "Share project" }).click({ force: true });
  await page.waitForTimeout(1500);
  const email = page.getByRole("textbox").first();
  await email.fill(EMAIL);
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: "Invite" }).click({ force: true });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${SCRATCH}/collab-invited.png` });
  const snap = await page.locator("body").ariaSnapshot();
  console.log(snap.split("\n").filter((l) => /flamapp|access|person|people/i.test(l)).join("\n"));
  await context.close();
}

// 2. As the collab account: sign in via minted magic link, save state.
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: "dark" });
  const page = await context.newPage();
  const token = mintMagicLinkToken(EMAIL);
  await page.goto(`${BASE}/auth/magic-link?token=${encodeURIComponent(token)}&callbackUrl=/dashboard`, {
    waitUntil: "domcontentloaded",
  });
  const nameField = page.locator("#magic-link-name");
  const outcome = await Promise.any([
    page.waitForURL((u) => u.pathname === "/welcome" || /(^|\/)dashboard(\/|$)/.test(u.pathname), { timeout: 45_000 }).then(() => "in" as const),
    nameField.waitFor({ state: "visible", timeout: 45_000 }).then(() => "name" as const),
  ]).catch(() => "fail" as const);
  console.log("collab sign-in outcome:", outcome, page.url());
  if (outcome === "name") {
    await nameField.fill("Ana Reyes");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL((u) => u.pathname === "/welcome" || /dashboard/.test(u.pathname), { timeout: 60_000 });
  }
  // Complete the welcome gate if present.
  if (page.url().includes("/welcome")) {
    for (let i = 0; i < 8; i++) {
      const skip = page.getByRole("button", { name: /Skip|Continue|Get started|Done|Next/i }).first();
      if (!(await skip.isVisible().catch(() => false))) break;
      await skip.click({ force: true }).catch(() => {});
      await page.waitForTimeout(1200);
      if (!page.url().includes("/welcome")) break;
    }
  }
  await page.waitForLoadState("networkidle").catch(() => {});
  // 3. Verify project access.
  await page.goto(`${BASE}/editor/${PROJECT}/canvas`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(5000);
  await page.getByRole("button", { name: "Skip for now" }).click({ force: true, timeout: 3000 }).catch(() => {});
  const nodes = await page.locator(".react-flow__node").count();
  console.log("collab sees canvas nodes:", nodes, "at", page.url());
  await page.screenshot({ path: `${SCRATCH}/collab-canvas.png` });
  await context.storageState({ path: COLLAB_STATE });
  await context.close();
}
await browser.close();
console.log("saved:", COLLAB_STATE);
