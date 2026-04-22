# Jekyll → Ghost mapping

The port preserves the original's file responsibilities. This table is the
authoritative reference when following the upstream Jekyll theme.

## Layouts

| Jekyll `_layouts/` | Ghost `theme/no-style-please-ghost/`  |
| ------------------ | ------------------------------------- |
| `default.html`     | `default.hbs`                         |
| `home.html`        | `home.hbs` (and `index.hbs` fallback) |
| `post.html`        | `post.hbs`                            |
| `page.html`        | `page.hbs`                            |
| `archive.html`     | `tag.hbs` (Ghost tag archive)         |

Additional Ghost-only routes:

| Ghost file      | Purpose            |
| --------------- | ------------------ |
| `author.hbs`    | Per-author archive |
| `error.hbs`     | Generic error page |
| `error-404.hbs` | 404                |
| `robots.txt`    | Crawler hints      |

## Includes → partials

| Jekyll `_includes/` | Ghost `partials/` |
| ------------------- | ----------------- |
| `head.html`         | `head.hbs`        |
| `back_link.html`    | `back-link.hbs`   |
| `menu_item.html`    | `menu.hbs`        |
| `post_list.html`    | `post-list.hbs`   |
| — (new)             | `navigation.hbs`  |

`partials/navigation.hbs` is a special override: Ghost's `{{navigation}}`
helper auto-discovers it, letting us replace Casper's `nav .nav-item`
wrapper with a plain `<ul>/<li>/<a>` that matches the no-style-please
aesthetic. Best practice per docs.ghost.org/themes/helpers/functional/navigation.

## Handlebars equivalents

| Jekyll / Liquid                               | Ghost Handlebars                              |
| --------------------------------------------- | --------------------------------------------- |
| `{{ page.title }}`                            | `{{title}}`                                   |
| `{{ site.title }}`                            | `{{@site.title}}`                             |
| `{{ site.description }}`                      | `{{@site.description}}`                       |
| `{{ page.date \| date: "%Y-%m-%d" }}`         | `{{date published_at format="YYYY-MM-DD"}}`   |
| `{% for post in site.posts %}`                | `{{#foreach posts}} … {{/foreach}}`           |
| `{% include head.html %}`                     | `{{> head}}`                                  |
| `site.baseurl \| append: "/assets/css/x.css"` | `{{asset "css/style.css"}}`                   |
| `site.data.menu.entries`                      | `@site.navigation` (Ghost primary navigation) |

## Dark-mode attribute

`default.hbs` hard-codes `<body a="auto">` instead of pulling from
`site.theme_config.appearance` (which does not exist in Ghost). To expose
the choice to the site owner later, declare a `custom` theme setting in
`theme/no-style-please-ghost/package.json` and read it from `default.hbs`.

## Typography custom settings

`package.json` declares two independent `config.custom` selects:

- `heading_font` — font for `<h1>`–`<h6>`.
- `body_font` — font for `<body>`.

Both share the same six options and default to `"Monospace (original)"`.
Neither uses the `group` field, so Ghost admin surfaces them in the
_Site-wide_ section (the default when `group` is omitted, per
docs.ghost.org/themes/custom-settings — only `"post"` and `"homepage"`
are valid `group` values).

`default.hbs` emits a body class per non-default selection (e.g.
`body-font-mplus1code`, `heading-font-noto-serif-jp`). The CSS under
`assets/css/style.css` defines one rule per class, each starting with
`var(--gh-font-body, …)` / `var(--gh-font-heading, …)` so that Ghost's
Brand → Typography panel can still take precedence.

Bundled web fonts are self-hosted variable woff2 files (SIL OFL 1.1):
`MPLUS1Code.woff2`, `NotoSansJP.woff2`, `NotoSerifJP.woff2`. The default
Monospace and the System presets never trigger a font download.

## Source-aligned helper usage

The theme mirrors the helper usage of Ghost's official
[Source](https://github.com/TryGhost/Source) theme where doing so does not
introduce decoration. Specifically:

| Feature              | Helper / pattern                                  | Where                        |
| -------------------- | ------------------------------------------------- | ---------------------------- |
| i18n                 | `{{t "..."}}`                                     | everywhere user-facing       |
| Pagination title     | `{{meta_title page=(t " (Page %)")}}`             | `partials/head.hbs`          |
| RSS discoverability  | `<link rel="alternate" type="application/rss+xml">` | `partials/head.hbs`        |
| Responsive feature image | `format="webp"` + 6-step srcset (xs → xxl)    | `partials/components/feature-image.hbs` |
| Members gate badge   | `{{^has visibility="public"}}`                    | `partials/post-list.hbs`     |
| Paywall CTA          | `{{#unless access}}` + `{{#match visibility "paid"}}` + `data-portal="signup"` | `post.hbs` |
| Prev / next post     | `{{#prev_post}}` / `{{#next_post}}`               | `partials/components/prev-next.hbs` |
| Related posts        | `{{#get "posts" filter="primary_tag:{{primary_tag.slug}}+id:-{{id}}" limit="3"}}` | `partials/components/related.hbs` |
| Author byline        | `{{{t "By {authors}" authors=(authors autolink="true" separator=", ")}}}` | `partials/components/author-footer.hbs` |
| Tag list             | `{{tags separator=", "}}`                         | `post.hbs` footer            |
| Reading time         | `{{reading_time minute=(t "1 min read") minutes=(t "% min read")}}` | `post.hbs` header |
| Featured posts       | `{{#get "posts" filter="featured:true+visibility:public" limit="3"}}` + `@custom.show_featured_posts` | `home.hbs` |
| Native comments      | `{{comments}}`                                    | `post.hbs`                   |
| Newsletter signup    | `<form data-members-form="signup">` + `data-members-email` | `partials/components/newsletter.hbs` |
| Portal sign in / account | `data-portal="signin"` / `data-portal="account"` | `partials/components/footer.hbs` |
| Portal search overlay | `<button data-ghost-search>`                     | `partials/components/search-toggle.hbs` |
| Pagination override  | `partials/pagination.hbs` (plain labels routed through `{{t}}`) | auto-discovered by `{{pagination}}` helper |
| Social links         | `{{social_url type="twitter"}}` etc.              | `author.hbs`                 |

Decoration-heavy patterns from Source are deliberately **not** ported:
inline SVG icon partials, multiple `header_style` layouts,
`site_background_color` / accent-color CSS variables, drop-caps and
featured-post layout variants, and the `photoswipe` lightbox. They
belong to Source's opinionated look; the no-style-please philosophy
keeps the rendered page close to browser defaults.

## CSS build pipeline

Source uses `gulp` + `PostCSS`; we reach the same endpoint with a
lighter stack:

- Sources live under `theme/no-style-please-ghost/src/css/` split into
  `style.css` (entry, `@layer` declaration, `@import`s), `fonts.css`,
  `dark-mode.css`, `base.css`, `layout.css`, and `components.css`.
- [Lightning CSS](https://lightningcss.dev/) (Rust) bundles and
  minifies them into `assets/css/style.css`, which is what Ghost
  actually serves via `{{asset "css/style.css"}}`. Native CSS features
  are used directly — nesting (`& .foo`), `@layer`, `:is()`, `:where()`,
  `prefers-color-scheme`. No Sass/PostCSS.
- Formatting + linting is [Biome](https://biomejs.dev/) (Rust). A
  single `biome.json` covers both CSS and JSON. Prettier and Stylelint
  are not installed.
- Package manager + task runner is [Bun](https://bun.sh/). `bun install`
  populates `node_modules` and `bun.lock`; `bun run build:css` etc.
  execute the npm scripts. CI uses `oven-sh/setup-bun@v3`.
- `task build` rebuilds CSS one-shot; `task watch` rebuilds on every
  change under `src/css/`. CI re-runs the build and fails if the
  committed `assets/css/style.css` drifts from source — run
  `task build` and commit the result.

### Why `task gscan` still runs on Node

Theme validation (`gscan theme/no-style-please-ghost`) keeps using a
`node:lts-alpine` container with `npm install -g gscan`, the exact
invocation docs.ghost.org recommends. gscan v6.0.1 has a latent bug in
`lib/checker.js` where check files are loaded via unsorted
`fs.readdirSync(checksDir)`; on bun 1.3.13 the filesystem order returns
check `120` before `040`, which lets `120` wipe `theme.helpers` without
repopulating it and makes `040-ghost-head-foot` flag false-positive
warnings. The Node runtime happens to return those entries
alphabetically and avoids the bug. Upstream fixes: oven-sh/bun#26570
sorts bun's `fs.readdir` entries; a one-line `.sort()` in gscan's
`loadChecks` would also suffice. Until one lands we follow the
docs-sanctioned path and leave every _other_ task on bun.

## Typography custom settings

Two independent `config.custom` selects (`heading_font`, `body_font`,
each with six options, default `"Monospace (original)"`) plus a single
homepage-scoped boolean (`show_featured_posts`, default `false`) are the
only admin-visible theme settings. Everything else is either derived
from Ghost's Brand / Design panels or handled automatically.

## Localisation

`locales/` ships translations for 21 locales: the twelve Ghost Foundation
reference locales (`de`, `de-CH`, `en`, `fr`, `ga`, `gd`, `nl`, `pt-BR`,
`sv`, `tr`, `uk`, `zh`, `zh-Hant`) plus nine widely-spoken additions
(`ja`, `ko`, `ru`, `ar`, `hi`, `es`, `it`, `pt`). `context.json` indexes
every key to the `.hbs` file(s) that use it, matching Source's
convention so future keys can be added without hunting.

Every key is present in every locale; missing values (if any) fall back
to the source English string per Ghost's `{{t}}` helper contract. Admin
users switch locales under _Settings → General → Publication language_.
