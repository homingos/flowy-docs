# Recording guide

Harness for producing the docs demo videos. Everything runs from this directory
(`flowy-docs/scripts/record`). The FE app must be serving on `localhost:3000`
(`pnpm start` in FE-genstudio after `pnpm build`).

## Commands

```bash
./node_modules/.bin/tsx run.ts --list                 # list clips
./node_modules/.bin/tsx run.ts <substr> [...]         # auth + record matching clips
./node_modules/.bin/tsx run.ts --no-auth <substr>     # reuse .auth/state.json
SCRATCH=<dir> ./node_modules/.bin/tsx probe-page.ts /some/url outname   # screenshot + aria snapshot
```

(`pnpm record` is broken by pnpm 11's deps check — always call tsx directly.)

## Writing a clip

One file per clip in `clips/<area>/<slug>.ts`, default-exporting a `Clip`
(see `lib/runner.ts`). `name` maps to `/videos/<name>.mp4` + poster
`/images/posters/<name>.jpg` — names must match the docs MDX embeds exactly.

- Loops: default `size` (1280×800), 8–20s of content, CRF 24 default.
- Walkthroughs: `size: [1920, 1080]`, 30–90s.
- Use the `h` helpers (`click`, `moveTo`, `type`, `scroll`, `drag`, `beat`) —
  never raw `locator.click()`, which teleports the cursor.
- Wrap any wait >4s (generation, upload) in `await h.skip(async () => …)` —
  it gets jump-cut in post.
- `h.mark()` resets the clip's visible start (everything before is trimmed).
- Prefer role/name selectors from a probe-page.ts run over guessed CSS.

## Rules

- Seeded projects (ids in `clips/config.json`) may be opened, favorited,
  edited additively — never deleted or trashed. For destructive demos
  (trash/restore), create a fresh project inside the clip first.
- NEVER complete a payment/checkout — opening plan pickers and purchase
  dialogs is fine; stop before any Stripe redirect/confirm.
- Invites: only `claude-user-3+<something>@flamapp.com` addresses.
- Generations spend workspace credits — keep to what the clip needs.
- Verify EVERY recorded clip: check the runner's printed size, probe duration
  (`ffprobe -v error -show_entries format=duration -of csv=p=0 ../../videos/<name>.mp4`),
  extract 2 frames (`ffmpeg -ss <t> -i ../../videos/<name>.mp4 -frames:v 1 <scratch>/f.png`)
  and LOOK at them. A clip that shows the wrong screen, a sign-in page, an
  empty state, or an open dev overlay is a failure — fix and re-record.
- Loops over 2 MB: re-record tighter or set `crf: 26`.

## Session

`run.ts` refreshes auth per run (skip with `--no-auth` when iterating fast).
Account: claude-user-3@flamapp.com on the dev backend. The workspace slug in
URLs resolves automatically — always use bare `/dashboard/...` URLs.

## Studio/editor URLs

Canvas: `/editor/<projectId>/canvas` · Studio: `/editor/<projectId>/studio`
(project ids in `clips/config.json`).
