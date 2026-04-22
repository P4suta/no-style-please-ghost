# no-style-please-ghost

A (nearly) no-CSS, fast, minimalist Ghost theme ported from
[riggraz/no-style-please](https://github.com/riggraz/no-style-please).

## Install

Copy or symlink this directory into `content/themes/no-style-please-ghost/` in
your Ghost instance, then activate it from _Settings → Design & branding →
Change theme → Installed_.

The top-level repository ships a Docker Compose setup that bind-mounts this
directory into a development Ghost container — see the repository's
[`README.md`](../../README.md).

## Building the CSS

The delivered `assets/css/style.css` is a Lightning CSS bundle of the
files under `src/css/` (`style.css` is the entry, then `fonts.css`,
`dark-mode.css`, `base.css`, `layout.css`, `components.css`). If you
fork this theme and edit any of those sources, run `bun run build:css`
(or `task build` from the repo root) before committing — the built
output is what Ghost actually serves.

## Appearance mode

Set `<body a="…">` in `default.hbs` to pick the color scheme:

- `auto` (default) — follows the user's system preference.
- `light` — always light.
- `dark` — always dark.

## Typography

Two independent selects under _Settings → Design & branding → Customize →
Site-wide_:

- **Heading font** — applied to `<h1>`–`<h6>`.
- **Body font** — applied to `<body>`.

Both offer the same six choices: **Monospace (original)** (default),
**M PLUS 1 Code**, **Noto Sans JP**, **Noto Serif JP**, **System sans-serif**,
**System serif**. The M PLUS / Noto families are self-hosted variable woff2
files under `assets/fonts/` (SIL Open Font License 1.1).

Ghost's own _Brand → Typography_ panel still wins: the theme CSS reads
`--gh-font-body` / `--gh-font-heading` first and falls back to the theme
select only when those variables are unset.

## Ghost features

All of the platform's built-in features are wired up, sitting inside the
theme's plain-HTML skin. Everything listed below is opt-in from the
Ghost admin — the theme simply renders what the platform emits.

- **Members / paywall** — gated posts get a `[Members only]` suffix in
  listings and a plain paywall CTA with a Portal `data-portal="signup"`
  link at the end of the post preview. Enable under _Settings → Membership_.
- **Newsletter signup** — the site-wide footer renders a minimal
  `<form data-members-form="signup">`. Portal handles submission and
  confirmation email.
- **Portal sign-in / account** — footer shows _Sign in_ / _Subscribe_
  while signed out, _Account_ while signed in. No icons.
- **Search overlay** — `<button data-ghost-search>` in the footer
  triggers Ghost's built-in search UI. Disabled silently when search is
  off in admin.
- **Native comments** — `{{comments}}` is emitted at the end of every
  post. Turn on under _Settings → Comments_.
- **Reading time, author byline, tag list, prev/next, related posts,
  featured posts on home** — all automatic, matching Source's
  helper-level patterns. Featured posts are opt-in via the
  _Homepage → Show featured posts_ theme setting.
- **RSS discoverability** — a `<link rel="alternate" type="application/rss+xml">`
  in the head lets readers auto-subscribe via feed apps.
- **Responsive images** — `feature_image` renders at 6 widths with
  `format="webp"`, served through Ghost's built-in image pipeline.

### Localisation

Translations ship for 21 locales. Pick one under _Settings → General →
Publication language_; admin values supported are `de`, `de-CH`, `en`,
`es`, `fr`, `ga`, `gd`, `hi`, `it`, `ja`, `ko`, `nl`, `pt`, `pt-BR`,
`ru`, `sv`, `tr`, `uk`, `zh`, `zh-Hant`, and the special-case `ar`.
Keys missing from a locale silently fall back to the English source
string (Ghost's default `{{t}}` behaviour).

## License

MIT — see [`LICENSE`](LICENSE). The theme is a derivative work of the
MIT-licensed original by Riccardo Graziosi (2020).
