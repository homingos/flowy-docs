/**
 * Setup (excluded from run.ts): provision "Ana Reyes"
 * (claude-user-3+collab@flamapp.com) as an Editor on masai maara and save her
 * storage state to .auth/collab.json for the collab/realtime clip.
 *
 * The share-modal UI can't do this: its email regex rejects "+" aliases, so
 * the invite goes through the backend collaborators API with the owner's
 * bearer token. Invites to registered users land as approval-required
 * notifications, so Ana accepts hers via POST /notifications/:id/action.
 *
 * Assumes .auth/state.json is fresh (run run.ts once, or lib/auth.ts
 * refreshStorageState). Idempotent — safe to re-run after a backend reset.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { type BrowserContext, chromium } from "playwright";
import { STATE_PATH, mintMagicLinkToken } from "../lib/auth.ts";
import { BASE_URL as BASE } from "../lib/env.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const COLLAB_STATE = join(HERE, "..", ".auth", "collab.json");
const SCRATCH = process.env.SCRATCH ?? "/tmp";
const EMAIL = "claude-user-3+collab@flamapp.com";
const PROJECT = "6a4adad69a876dea0d2d112e";

const FE_ROOT =
  process.env.FE_ROOT ?? "/Users/riteshbucha/Desktop/homingos/research/genstudio/FE-genstudio";
const envText = readFileSync(join(FE_ROOT, ".env.local"), "utf8");
const BACKEND = envText.match(/^export NEXT_PUBLIC_BACKEND_URL=(.+)$/m)![1].trim();

async function accessTokenOf(context: BrowserContext): Promise<string> {
  const res = await context.request.get(`${BASE}/api/auth/session`);
  const sess = (await res.json()) as { accessToken?: string };
  if (!sess?.accessToken) throw new Error(`no accessToken in session: ${JSON.stringify(sess).slice(0, 200)}`);
  return sess.accessToken;
}

const browser = await chromium.launch({ headless: true });

// 1. Sign the collab account in via minted magic link (creates it on first
//    run) and save its storage state.
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
  if (outcome === "fail") throw new Error("collab sign-in stalled");
  if (outcome === "name") {
    await nameField.fill("Ana Reyes");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL((u) => u.pathname === "/welcome" || /dashboard/.test(u.pathname), { timeout: 60_000 });
  }
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
  await context.storageState({ path: COLLAB_STATE });
  await context.close();
}

// 2. As the owner: invite via the backend collaborators API.
{
  const context = await browser.newContext({ storageState: STATE_PATH });
  const token = await accessTokenOf(context);
  const res = await context.request.post(`${BACKEND}/api/projects/${PROJECT}/collaborators`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    data: { collaborators: [{ email: EMAIL, permissions: "editor" }] },
  });
  console.log("invite status:", res.status(), (await res.text()).slice(0, 300));
  await context.close();
}

// 3. As Ana: accept the approval-invite notification (skips when none is
//    pending — e.g. she's already active), then verify canvas access.
{
  const context = await browser.newContext({
    storageState: COLLAB_STATE,
    viewport: { width: 1280, height: 800 },
    colorScheme: "dark",
  });
  const token = await accessTokenOf(context);
  const auth = { Authorization: `Bearer ${token}` };
  const listRes = await context.request.get(`${BACKEND}/api/notifications?limit=50`, { headers: auth });
  const list = (await listRes.json()) as { data?: { items?: any[] } };
  const invite = (list.data?.items ?? []).find(
    (n) => n.type === "project_invite" && n.action_state === "pending" && n.resource?.id === PROJECT,
  );
  if (invite) {
    const actRes = await context.request.post(`${BACKEND}/api/notifications/${invite.id}/action`, {
      headers: { ...auth, "Content-Type": "application/json" },
      data: { action: "accept" },
    });
    console.log("accept status:", actRes.status());
  } else {
    console.log("no pending project_invite notification — assuming already accepted");
  }

  const page = await context.newPage();
  await page.goto(`${BASE}/editor/${PROJECT}/canvas`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(8000);
  await page.getByRole("button", { name: "Skip for now" }).click({ force: true, timeout: 3000 }).catch(() => {});
  const nodes = await page.locator(".react-flow__node").count();
  console.log("collab sees canvas nodes:", nodes, "at", page.url());
  if (nodes === 0) throw new Error("collab account still has no canvas access");
  await page.screenshot({ path: `${SCRATCH}/collab-canvas.png` });
  await context.close();
}
await browser.close();
console.log("saved:", COLLAB_STATE);
