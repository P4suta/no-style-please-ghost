# Setup

A small, one-time checklist for a fresh clone. Each step is safe to repeat.

## 1. Environment file

```sh
cp .env.example .env
```

Review `.env`; the shipped values are **development defaults** and must be
changed before any public-facing use.

## 2. Start the stack

Two modes are available:

### 2a. Distribution mode (default) — try the theme like an end user

```sh
task up           # docker compose -f compose.yaml up -d --wait
```

This boots a **vanilla Ghost** with no theme pre-provisioned — exactly
what a site admin sees on a fresh install. You then upload the built
`.zip` through the admin UI, just like a released theme. See
[section 3d](#3d-build-the-theme-zip-and-upload-it) below.

### 2b. Development mode — live edits

```sh
task dev          # docker compose up -d --wait (merges compose.override.yaml)
```

`compose.override.yaml` adds `NODE_ENV=development` and bind-mounts the
theme directory read-write, so `.hbs` / `.css` changes are visible
without re-zipping. The theme still needs to be activated once after
first boot; after that the bind-mount keeps it live.

Wait until `docker compose ps` reports `ghost` as `healthy` (first boot
takes ~30s because Ghost runs its migrations against MySQL).

## 3. First-run Ghost setup

Ghost's owner account has to be created from the browser:

1. Open <http://localhost:2368/ghost/>.
2. Fill in the site title, your name, email, and a password.

### 3a. Distribution mode (`task up`) — upload the zip

In this mode the theme is not on disk yet, so:

1. In another terminal: `task zip` — builds
   `dist/no-style-please-ghost-<version>.zip`.
2. In the admin UI: _Settings → Design & branding → Change theme →
   Upload theme_, drop the `.zip` in, and activate it.

### 3b. Development mode (`task dev`) — activate the bind-mounted copy

The theme is already present under
`content/themes/no-style-please-ghost/`, so:

1. _Settings → Design & branding → Change theme → Installed →
   **no-style-please-ghost** → Activate_.

### 3d. Build the theme zip and upload it

```sh
task zip
```

Wraps `task build` (Lightning CSS) and packages
`theme/no-style-please-ghost/` into
`dist/no-style-please-ghost-<version>.zip`, excluding `src/` (sources
are not needed at runtime — the bundled `assets/css/style.css` is what
Ghost serves). Upload it via _Settings → Design & branding → Change
theme → Upload theme_.

## Pick the typography (optional)

Once the theme is active, visit _Settings → Design & branding → Customize_
and find the **Site-wide** section (this is the default location for
custom settings that have no `group` field, per Ghost's `config.custom`
spec). Two independent selects are exposed:

- **Heading font** — used by `<h1>`–`<h6>`.
- **Body font** — used by `<body>` and any element that inherits from it.

Both selects share the same six options:

- **Monospace (original)** — the canonical look, matching the upstream
  Jekyll theme. No web font is requested.
- **M PLUS 1 Code** — a Japanese-capable monospace. Self-hosted variable
  font (≈1.6 MB woff2).
- **Noto Sans JP** — Japanese Gothic. Self-hosted variable font
  (≈4.0 MB woff2).
- **Noto Serif JP** — Japanese Mincho. Self-hosted variable font
  (≈5.5 MB woff2).
- **System sans-serif** — `system-ui, -apple-system, Segoe UI, Roboto, …`.
  No web font request.
- **System serif** — `ui-serif, Georgia, "Times New Roman", serif`.
  No web font request.

Picking heading and body separately means you can, for example, run the
site in Monospace body + Noto Serif JP headings without switching a
single theme-wide preset.

### Interaction with Ghost's Brand → Typography panel

Ghost ships its own font picker under _Settings → Design & branding →
Brand → Typography_ (a fixed list of Google-hosted fonts). Whenever the
admin picks a font there, Ghost emits `--gh-font-body` and
`--gh-font-heading` CSS variables through `{{ghost_head}}`. Every font
rule in `style.css` starts with `var(--gh-font-body, …)` / `var(--gh-font-heading, …)`,
so the Brand pick always wins and the theme select only provides the
fallback stack.

Theme authors cannot extend Ghost's Brand font list — the list is built
into Ghost admin. That's why M PLUS / Noto are exposed as theme-level
options instead.

## 3c. Turn on the Ghost features you want (optional)

The theme renders each of Ghost's built-in features when the matching
admin setting is enabled; nothing is forced. Flip these on as needed
under _Settings_:

- **Membership** — gates posts, paywall CTA, Portal sign-in / account
  links in the footer.
- **Newsletter** — the footer subscribe form uses Ghost Portal; the
  confirmation flow is wired automatically.
- **Comments** — native Ghost comments appear at the bottom of every
  post when this is on.
- **Show featured posts** — theme setting under _Design & branding →
  Customize → Homepage → Show featured posts_ (boolean). Off by default.
- **Search** — the footer `data-ghost-search` button is inert unless
  Ghost's internal search is enabled.

### Localisation

Translations ship for 21 locales (twelve reference locales from Ghost
Source plus `ja`, `ko`, `ru`, `ar`, `hi`, `es`, `it`, `pt`). Admins pick
the active locale under _Settings → General → Publication language_.

## 4. Theme iteration loop

The theme's CSS is **built** from `theme/no-style-please-ghost/src/css/`
with Lightning CSS (Rust-based CSS bundler/minifier) and committed to
`theme/no-style-please-ghost/assets/css/style.css`. Edit the sources
under `src/css/`, then:

```sh
task install     # first time only — `bun install` inside docker
task build       # bundle src/css into assets/css/style.css
task watch       # auto-rebuild on src/css changes
```

All dev tooling runs in a throw-away `oven/bun:1-alpine` container, so
the host stays clean of Node/Bun/npm. Bun handles install and script
execution in a single binary.

Formatting + linting is Biome (one tool for JSON + CSS, no Prettier or
Stylelint). Typical cycle:

```sh
task check       # biome format + lint, read-only
task fix         # same, with auto-fix
task gscan       # Ghost theme validator
```

Other iteration notes:

- `.hbs` edits — usually reflected on reload. If not:
  ```sh
  task restart
  ```
- `.css` edits — run `task build` (or leave `task watch` running) and
  Ghost picks up the new `assets/css/style.css?v=…` on reload.
- Editing `theme/no-style-please-ghost/package.json` — **always** restart
  the Ghost container, since Ghost only reads theme metadata on boot.

## 5. Teardown

```sh
task down          # stop, keep volumes
docker compose down -v   # also wipe ghost content + mysql data
```
