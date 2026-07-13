# The recording harness

Lives in `scripts/record/` — a self-contained nested package (own
`package.json`, gitignored `node_modules`), so it never disturbs Mintlify. It
drives a **local build of the app** with Playwright, injects a fake cursor,
records each flow, and transcodes to a docs-ready mp4 + poster. `RECORDING.md`
in that directory is the operator's cheat-sheet; this file is the "how it works
+ how to extend it" reference.

## One-time setup

1. **Run the app locally.** Prefer a production build (no dev overlay, no compile
   stalls): in the app repo, `pnpm build && pnpm start` → serves `:3000`. The app
   points at the hosted **dev** backend, so no local backend is needed.
2. **Install the harness.** In `scripts/record/`: `pnpm install` then
   `npx playwright install chromium`. (esbuild's build script must be approved —
   `pnpm-workspace.yaml` lists it under `onlyBuiltDependencies`.)
3. **Auth.** `run.ts` mints a stateless magic-link token (HMAC-SHA256 over the
   app's `AUTH_SECRET`, read from the app repo's `.env.local`) and signs in —
   fully scripted, no manual step. `lib/auth.ts` mirrors the app's
   `src/lib/auth/magic-link.ts`; if that file changes, mirror it again.
4. **Onboard once.** `tsx setup/onboard.ts` completes the `/welcome` gate so
   recorded sessions land straight on the dashboard.
5. **Seed once.** `tsx setup/seed.ts N` remixes N community templates into the
   demo workspace so canvas clips open on rich, good-looking projects — never an
   empty canvas. Project ids land in `clips/config.json`.

## Running

```bash
# from scripts/record/ — call tsx directly (pnpm 11's deps check breaks `pnpm record`)
./node_modules/.bin/tsx run.ts --list                # list clips
./node_modules/.bin/tsx run.ts <substr> [...]        # re-auth + record matching clips
./node_modules/.bin/tsx run.ts --no-auth <substr>    # reuse saved session (fast iterate)
SCRATCH=<dir> ./node_modules/.bin/tsx probe-page.ts /url out   # screenshot + aria snapshot
```

`probe-page.ts` is how you discover real role/name selectors before writing a
clip — always probe, don't guess CSS.

## Writing a clip

One file per clip in `clips/<area>/<slug>.ts`, default-exporting a `Clip`
(shape in `lib/runner.ts`). `name` maps to the output `/videos/<name>.mp4` and
poster — it **must** equal the path embedded in the MDX.

```ts
import type { Clip } from "../../lib/runner.ts";

const clip: Clip = {
  name: "canvas/node-text",
  url: "/dashboard",                 // or /editor/<id>/canvas from clips/config.json
  // size: [1920, 1080],            // walkthroughs only; default 1280x800
  actions: async ({ page, h }) => {
    await h.click(page.getByRole("button", { name: "Add a node" }));
    await h.type(page.getByRole("textbox"), "A misty forest at dawn");
    await h.skip(async () => waitForGeneration(page));  // jump-cut long waits in post
  },
};
export default clip;
```

Use the `h` helpers (`click`, `moveTo`, `type`, `scroll`, `drag`, `beat`,
`skip`, `mark`) — never raw `locator.click()`, which teleports the cursor with no
visible motion. `h.skip(fn)` records the wall-clock span of a long wait
(generation, render, upload) so ffmpeg jump-cuts it, keeping ~1.5s of the loading
state then cutting to the reveal. `h.mark()` resets the visible start (trims
everything before it).

## Encoding (automatic, in `lib/runner.ts`)

webm → h264 mp4, `yuv420p`, `+faststart`, 30fps, CRF 24 (set `crf: 26` on a clip
if it exceeds budget), plus a poster JPG at ~1s. Loops target under 2 MB, hard
cap 8 MB.

## Verify EVERY clip

A green "done" is not proof. For each recorded clip:

```bash
ffprobe -v error -show_entries format=duration -of csv=p=0 ../../videos/<name>.mp4
ffmpeg -ss <t> -i ../../videos/<name>.mp4 -frames:v 1 <scratch>/f.png   # then LOOK at it
```

A clip showing a sign-in page, an empty state, a stuck spinner, the wrong screen,
or a dev overlay is a **failure** — fix and re-record. A too-short duration
usually means a selector didn't match and the actions no-op'd.

## Tiers (record in this order)

- **T1 pure-UI** — dashboard, settings, project CRUD, canvas nav/toolbar/wiring,
  context menus. Fully deterministic, cheap.
- **T2 one-generation** — image/audio/vector gen, image tools, AI-chat build.
  Wrap the wait in `h.skip`, generous timeout, one retry. Costs credits — budget
  per batch.
- **T3 hard** — video gen + render (minutes + credits; record once, trim hard),
  multiplayer (two browser contexts, two accounts), voice
  (`--use-fake-device-for-media-stream`), 3D/WebGL (headed GPU). Do last with
  fallbacks.

## Rules for recording sessions

- Seeded projects (`clips/config.json`) may be opened/favorited/edited additively,
  never deleted. For destructive demos (trash/restore) create a fresh project
  in-clip.
- Never complete a payment — opening plan pickers and purchase dialogs is fine,
  stop before any checkout confirm.
- Generations spend real workspace credits — keep to what the clip needs.
- Parallel recording agents work, but they share one login — pass `--no-auth` so a
  fresh `run.ts` doesn't rotate the session out from under a sibling.

## Portability

To reuse this harness in another Mintlify + Next-app docs setup: keep
`lib/{runner,human,cursor,env}.ts` verbatim; re-point `env.ts` FE_ROOT; re-mirror
`lib/auth.ts` to the target app's auth flow; rewrite `setup/` for that app's
onboarding/seed; write new `clips/`.
