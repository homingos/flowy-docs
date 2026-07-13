import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The FE repo's .env.local uses shell format (`export VAR=value`), so we
 * parse it by hand instead of pulling in dotenv.
 */
const FE_ROOT =
  process.env.FE_ROOT ??
  "/Users/riteshbucha/Desktop/homingos/research/genstudio/FE-genstudio";

function parseShellEnv(file: string): Record<string, string> {
  const out: Record<string, string> = {};
  let text: string;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    return out;
  }
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const m = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    let value = m[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[m[1]] = value;
  }
  return out;
}

const feEnv = {
  ...parseShellEnv(join(FE_ROOT, ".env")),
  ...parseShellEnv(join(FE_ROOT, ".env.local")),
};

export const AUTH_SECRET =
  process.env.AUTH_SECRET ?? feEnv.AUTH_SECRET ?? feEnv.NEXTAUTH_SECRET;

export const BASE_URL = process.env.RECORD_BASE_URL ?? "http://localhost:3000";
export const RECORD_EMAIL =
  process.env.RECORD_EMAIL ?? "claude-user-3@flamapp.com";
export const RECORD_NAME = process.env.RECORD_NAME ?? "Flowy Docs";

if (!AUTH_SECRET) {
  throw new Error(
    `AUTH_SECRET not found in ${FE_ROOT}/.env.local — set FE_ROOT or AUTH_SECRET explicitly.`,
  );
}
