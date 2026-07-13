import { createHmac } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

import { AUTH_SECRET, BASE_URL, RECORD_EMAIL, RECORD_NAME } from "./env.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const STATE_PATH = join(HERE, "..", ".auth", "state.json");

function base64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

/** Mirror of FE-genstudio src/lib/auth/magic-link.ts createMagicLinkToken(). */
export function mintMagicLinkToken(email: string, ttlSeconds = 15 * 60): string {
  const iat = Math.floor(Date.now() / 1000);
  const payload = {
    email: email.trim().toLowerCase(),
    iat,
    exp: iat + ttlSeconds,
  };
  const payloadB64 = base64url(JSON.stringify(payload));
  const sigB64 = base64url(
    createHmac("sha256", AUTH_SECRET!).update(payloadB64).digest(),
  );
  return `${payloadB64}.${sigB64}`;
}

/**
 * Sign in via a minted magic link and save Playwright storageState.
 * Regenerated at the start of every run — backend session rotation makes
 * stale states unreliable.
 */
export async function refreshStorageState(email = RECORD_EMAIL): Promise<string> {
  mkdirSync(dirname(STATE_PATH), { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const token = mintMagicLinkToken(email);
  await page.goto(
    `${BASE_URL}/auth/magic-link?token=${encodeURIComponent(token)}&callbackUrl=/dashboard`,
    { waitUntil: "domcontentloaded" },
  );

  // Match the PATH only — the magic-link URL itself contains
  // "callbackUrl=/dashboard" in its query string.
  const isAppUrl = (u: URL) =>
    u.pathname === "/welcome" || /(^|\/)dashboard(\/|$)/.test(u.pathname);

  // Brand-new account: the page asks for a display name before signing up.
  const nameField = page.locator("#magic-link-name");
  const outcome = await Promise.any([
    page.waitForURL(isAppUrl, { timeout: 30_000 }).then(() => "signed-in" as const),
    nameField
      .waitFor({ state: "visible", timeout: 30_000 })
      .then(() => "needs-name" as const),
  ]).catch(() => "failed" as const);

  if (outcome === "failed") {
    throw new Error(`magic-link sign-in stalled at ${page.url()}`);
  }
  if (outcome === "needs-name") {
    await nameField.fill(RECORD_NAME);
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL(isAppUrl, { timeout: 60_000 });
  }

  // Let the workspace cookie + session settle.
  await page.waitForLoadState("networkidle").catch(() => {});
  await context.storageState({ path: STATE_PATH });
  await browser.close();
  console.log(`  auth ok (${email}) → ${STATE_PATH}`);
  return STATE_PATH;
}
