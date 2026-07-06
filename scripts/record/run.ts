import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { refreshStorageState } from "./lib/auth.ts";
import { type Clip, recordClip } from "./lib/runner.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const CLIPS_DIR = join(HERE, "clips");

function listClipFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listClipFiles(p));
    else if (/\.(ts|mts)$/.test(entry.name) && !entry.name.startsWith("_")) out.push(p);
  }
  return out.sort();
}

async function main() {
  const args = process.argv.slice(2);
  const listOnly = args.includes("--list");
  const noAuth = args.includes("--no-auth");
  const patterns = args.filter((a) => !a.startsWith("--"));

  const files = listClipFiles(CLIPS_DIR);
  const clips: Clip[] = [];
  for (const f of files) {
    const mod = await import(pathToFileURL(f).href);
    const exported: Clip | Clip[] = mod.default;
    for (const c of Array.isArray(exported) ? exported : [exported]) {
      if (c?.name && c?.actions) clips.push(c);
    }
  }

  const selected = patterns.length
    ? clips.filter((c) => patterns.some((p) => c.name.includes(p)))
    : clips;

  if (listOnly) {
    for (const c of selected) console.log(c.name);
    return;
  }
  if (!selected.length) {
    console.error("No clips matched:", patterns.join(", "));
    process.exit(1);
  }

  if (!noAuth) await refreshStorageState();

  const failures: string[] = [];
  for (const clip of selected) {
    try {
      await recordClip(clip);
    } catch {
      failures.push(clip.name);
    }
  }
  console.log(`\ndone: ${selected.length - failures.length}/${selected.length} ok`);
  if (failures.length) {
    console.log("failed:", failures.join(", "));
    process.exit(1);
  }
}

main();
