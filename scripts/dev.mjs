// Local docs preview.
//
// The committed api-reference/openapi.json lists ONLY the production server,
// so the deployed (public) docs stay clean — no internal dev/localhost URLs.
// For local development we temporarily add Development + Local to the API
// playground's server dropdown, then restore the production-only spec when the
// preview exits, keeping commits and the deployed site clean.
//
// Note: if this process is hard-killed (kill -9), the spec may be left with the
// extra servers — run `git checkout api-reference/openapi.json` to restore it.
import { readFileSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const SPEC = fileURLToPath(new URL("../api-reference/openapi.json", import.meta.url));

const EXTRA_SERVERS = [
  {
    url: "https://fi.development.flamapis.com/genstudio-svc-v2/api",
    description: "Development",
  },
  {
    url: "http://localhost:8000/genstudio-svc-v2/api",
    description: "Local",
  },
];

const original = readFileSync(SPEC, "utf8");
const spec = JSON.parse(original);
// Keep the committed (production) server first/default; append local-only ones.
spec.servers = [...spec.servers, ...EXTRA_SERVERS];
writeFileSync(SPEC, `${JSON.stringify(spec, null, 2)}\n`);

let restored = false;
const restore = () => {
  if (restored) return;
  restored = true;
  try {
    writeFileSync(SPEC, original);
  } catch {
    // best-effort; see note above about hard kills
  }
};

process.on("exit", restore);
process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));

const child = spawn("mintlify", ["dev", "--port", "3334"], {
  stdio: "inherit",
  shell: true,
});
child.on("exit", (code) => process.exit(code ?? 0));
