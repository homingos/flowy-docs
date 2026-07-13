---
name: video-docs
description: Build or extend this Mintlify docs site the Dub way — deeply nested navigation with a short screen-recorded demo video on every feature page. Use when asked to write/rewrite docs pages, add a new docs section, restructure the nav, add feature videos, or record product demo clips for the docs. Covers the docs.json nav shape, page/frontmatter conventions, the DemoVideo/VideoPlayer components, and the Playwright recording harness in scripts/record/.
---

# Building video docs

This repo is a **Mintlify** site (config `docs.json`, `aspen` theme). Its house
style, copied from [dubinc/docs](https://github.com/dubinc/docs): a deeply
nested nav and a **short demo video on every feature page** — a silent
autoplaying loop for most pages, a click-to-play walkthrough for the few long
flows. Videos are produced by an automated Playwright harness in
`scripts/record/`, not recorded by hand.

Follow this skill whenever you add or rewrite docs. Match what already exists —
read a neighbouring page before writing a new one.

## The four moving parts

1. **`docs.json`** — the nav tree (`tabs → groups → pages`, nesting allowed) plus
   `redirects[]`. Adding a page means adding both the `.mdx` file and its path
   string to the nav.
2. **Page `.mdx` files** — lede → hero video → sections. Conventions in
   `references/conventions.md`.
3. **Video components** — `snippets/components/demo-video.jsx` (silent loop) and
   `snippets/components/video-player.jsx` (click-to-play). Already built; import
   and use them, don't reinvent.
4. **Recording harness** — `scripts/record/`, one clip script per video. See
   `references/recording.md` and `scripts/record/RECORDING.md`.

## Workflow

**Adding one page**
1. Add the page path to the right group in `docs.json`.
2. Write the `.mdx` per `references/conventions.md`, embedding its final video
   path (`/videos/<area>/<slug>.mp4` + poster `/images/posters/<area>/<slug>.jpg`)
   even before the file exists.
3. Write a clip script `scripts/record/clips/<area>/<slug>.ts`, record it, and
   verify the footage (see recording reference — always extract frames and LOOK).
4. `pnpm check` and `pnpm broken-links`.

**A larger rewrite / new section** — work in phases so nothing half-lands:
1. **Scaffold** — edit `docs.json` nav + `redirects[]`; create stub `.mdx` for
   every new page (`title`/`description` frontmatter + one line) so
   `pnpm check` passes; delete/redirect anything you're replacing.
2. **Write** — fill every page with real content, embedding final video paths.
   Ground every UI claim, label, limit, and price in the app source — never
   invent them. For breadth, fan out one writer agent per section.
3. **Record** — build the demo account once (`references/recording.md`), then
   record clips in tiers: pure-UI first, one-generation next, hard/expensive last.
4. **Validate** — media audit (every referenced `/videos/*` + poster exists on
   disk), `pnpm check`, `pnpm broken-links`, manual `pnpm dev` pass.

## Non-negotiables

- **Never break a URL.** Moved pages get a `redirects[]` entry. The app deep-links
  into these paths (see `../../src/lib/docs.ts` equivalents / this repo's
  `AGENTS.md`): `api/authentication`, `api/permissions`, `api/running-apps`,
  `collaboration/{roles,workspaces,sharing}`, `billing/credits` — keep them live.
- **Every feature page ships a video + poster.** No GIFs, no `<iframe>`, no bare
  `<img>` for motion.
- **Accuracy over completeness.** If the source doesn't confirm a detail, leave it
  out. Don't document flagged/experimental features.
- **Captions must match the footage.** If a clip ends up showing something other
  than planned, fix the one caption line, don't ship a lie.

## Gotchas (learned the hard way)

- Mintlify snippet `.jsx` files **cannot `import` from `react`** — hooks
  (`useState`) are already in scope. Local imports only.
- `<2` (or any `<digit`) in Markdown is parsed as a JSX tag and breaks the build.
  Write "under 2 MB".
- `docs.json` `redirects` are `{ "source", "destination" }`, root-relative, no
  `.mdx`.
- `pnpm broken-links` does **not** check media paths — audit `/videos` + posters
  separately with a grep-vs-`ls` diff.

`references/conventions.md` — page anatomy, frontmatter, components, video rules.
`references/recording.md` — the harness: auth, seeding, writing/verifying clips.
