# Page & authoring conventions

Read a neighbouring page in the same section before writing — match its shape.

## Frontmatter

```yaml
---
title: "Image Node"                 # Title Case, ≤ 45 chars
description: "One benefit-led sentence."   # shown in nav + search + og
sidebarTitle: "Image"               # only when title is long
"og:image": "/images/hero.png"      # hub/overview pages only (quotes required — the colon)
---
```

## Page anatomy (feature pages)

1. **Lede** — 1–2 sentences. No `#` heading; the title renders from frontmatter.
2. **Hero video** — immediately after the lede (Dub help-article shape: media
   before prose).
3. **`##` sections** — focused. 300–800 words typical; longer only when the
   feature genuinely warrants it.

Hub/overview pages are the exception: short intro → `<CardGroup>` of links, no
wall of text.

## Video embeds

Silent loop — the default, most pages:

```mdx
import { DemoVideo } from "/snippets/components/demo-video.jsx";

<DemoVideo
  src="/videos/<area>/<slug>.mp4"
  poster="/images/posters/<area>/<slug>.jpg"
  caption="Present-tense description of what the clip shows"
/>
```

Click-to-play walkthrough — only for the few long (30–90s) flows:

```mdx
import { VideoPlayer } from "/snippets/components/video-player.jsx";

<VideoPlayer
  src="/videos/<area>/<slug>.mp4"
  poster="/images/posters/<area>/<slug>.jpg"
  title="Watch: <what the walkthrough covers>"
/>
```

- Import line(s) go directly under the frontmatter, one blank line before the lede.
- Loops are recorded 1280×800 (`DemoVideo` aspect 16/10 — don't override).
- Walkthroughs are 1920×1080 (`VideoPlayer` aspect 16/9 — don't override).
- One hero per page. Secondary clips only for a genuinely different flow
  (e.g. a second engine inside a `<Tab>`).
- Naming: video `/videos/<area>/<slug>[-variant].mp4`, poster mirrored at
  `/images/posters/<area>/<slug>[-variant].jpg`, kebab-case. The path in the MDX
  is the contract the recording harness fulfils — pick it before recording.

## Mintlify components — when to use which

| Component | Use for |
| --- | --- |
| `<Steps>` / `<Step>` | ≥3 sequential actions |
| `<Tabs>` / `<Tab>` | mutually exclusive variants (e.g. two engines, settings sections) |
| `<CardGroup>` / `<Card>` | hub/overview pages only — never mid-article |
| `<AccordionGroup>` / `<Accordion>` | FAQs only |
| `<Note>` / `<Tip>` / `<Warning>` | max 2 per page |
| `<Frame>` | still images (reuse existing `/images/*.png` where accurate) |
| tables + `<kbd>` | keyboard shortcuts |

## Voice

Second person, present tense, plain. No "simply / just / easily". No marketing
fluff. Remove every `{/* TODO */}` comment — nothing TODO-shaped ships.

## Links

Root-relative (`/canvas/nodes/image`). Never link a redirected legacy path.

## Accuracy

Every UI label, limit, price, model name, and shortcut must trace to the app
source (or the page being replaced). When the source doesn't confirm it, write
around it. Do not document flagged/experimental features.
