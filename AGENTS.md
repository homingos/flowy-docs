# Flowy Docs — authoring guide

Mintlify site (`docs.json` schema, aspen theme, dark default, brand `#5C9987`). Deployed to docs.tryflowy.ai by the Mintlify GitHub app on push to `main`.

## Structure

- Three tabs in `docs.json`: **Documentation**, **Help Center**, **API Reference**.
- Navigation is nested: `tabs → groups → pages`, where a pages entry is a path string or a nested `{ "group", "pages" }` object. Moved pages get a `redirects[]` entry — never break an existing URL.
- These paths are deep-linked from the app (`FE-genstudio/src/lib/docs.ts`) and must keep resolving: `api/authentication`, `api/permissions`, `api/running-apps`, `collaboration/roles`, `collaboration/workspaces`, `collaboration/sharing`, `billing/credits`, `generators/overview` (redirect).

## Page conventions

- Frontmatter: `title` (Title Case, ≤45 chars), `description` (one benefit-led sentence), `sidebarTitle` when the title is long, `"og:image"` only on hub pages.
- Feature-page shape: 1–2 sentence lede → **hero video** → `##` sections.
- `<Steps>` for ≥3 sequential actions; `<Tabs>` for mutually exclusive variants; `<CardGroup>` only on hub/overview pages; `<AccordionGroup>` for FAQs; max 2 callouts per page; shortcuts as tables with `<kbd>`.
- Internal links are root-relative (`/canvas/nodes/image`). Never link to redirected legacy paths (`/generators/*`, `/canvas/nodes`, `/canvas/ai-chat`).
- Voice: second person, present tense, plain. No "simply/just/easily". Every UI label, limit, and price must match the product — when unsure, verify against FE-genstudio source or leave it out.

## Videos

Two embed patterns, both from `/snippets/components/`:

```mdx
import { DemoVideo } from "/snippets/components/demo-video.jsx";

<DemoVideo
  src="/videos/<area>/<clip>.mp4"
  poster="/images/posters/<area>/<clip>.jpg"
  caption="Present-tense caption"
/>
```

for silent 5–20s loops (1280×800, aspect 16/10), and

```mdx
import { VideoPlayer } from "/snippets/components/video-player.jsx";

<VideoPlayer src="…" poster="…" title="Watch: …" />
```

for 30–90s click-to-play walkthroughs (1920×1080, 16/9).

Rules: h264 mp4, `yuv420p`, `+faststart`, muted, no browser chrome; loops target under 2 MB (hard cap 8 MB); every video ships a poster JPG at the mirrored path under `/images/posters/`; **no GIFs**.

Videos are produced by the automation harness in `scripts/record/` — one clip script per video, recorded against a local FE-genstudio server (see the repo README).

## Checks

```bash
pnpm check          # mintlify validate
pnpm broken-links   # internal link check (does NOT check media paths)
pnpm dev            # local preview on :3334
```

Media paths aren't validated by Mintlify — after adding pages or clips, diff MDX-referenced `/videos/*` + `/images/posters/*` against files on disk.
