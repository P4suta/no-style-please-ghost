# no-style-please-ghost

[![CI](https://github.com/P4suta/no-style-please-ghost/actions/workflows/ci.yml/badge.svg?branch=main&event=push)](https://github.com/P4suta/no-style-please-ghost/actions/workflows/ci.yml?query=branch%3Amain+event%3Apush)
[![Actions security](https://github.com/P4suta/no-style-please-ghost/actions/workflows/zizmor.yml/badge.svg?branch=main&event=push)](https://github.com/P4suta/no-style-please-ghost/actions/workflows/zizmor.yml?query=branch%3Amain+event%3Apush)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A Ghost port of [riggraz/no-style-please](https://github.com/riggraz/no-style-please) — a
(nearly) no-CSS, fast, minimalist theme.

The repository ships a self-contained Docker Compose environment so the theme
can be developed without installing Ghost or Node on the host.

## Quick start

There are two modes. Pick whichever matches what you're doing.

### Try the theme like an end user (distribution mode, default)

```sh
cp .env.example .env
task up           # vanilla Ghost + MySQL, no theme pre-installed
task install      # one-time: bun + biome + lightningcss
task zip          # dist/no-style-please-ghost-<version>.zip
```

Open <http://localhost:2368/ghost/>, finish the owner setup, then
_Settings → Design & branding → Change theme → Upload theme_ → drop
the zip → activate. This is the same flow a real site admin follows.

### Live theme editing (development mode)

```sh
cp .env.example .env
task dev          # same stack, with the theme bind-mounted
task install
task watch        # auto-rebuild src/css/ on change
```

Complete the owner setup, then activate **no-style-please-ghost**
under _Installed_ (it's already mounted on disk).

### After activation (either mode)

_Design & branding → Customize → Site-wide_ exposes two independent
selects — **Heading font** and **Body font** — with six choices each
(Monospace / M PLUS 1 Code / Noto Sans JP / Noto Serif JP / System
sans-serif / System serif).

## Repository layout

| Path                           | Purpose                                   |
| ------------------------------ | ----------------------------------------- |
| `compose.yaml`                 | Ghost + MySQL service definition          |
| `compose.override.yaml`        | Dev-only overrides (auto-merged)          |
| `theme/no-style-please-ghost/` | The Ghost theme source (bind-mounted)     |
| `docs/`                        | Setup, mapping, and licensing notes       |
| `Taskfile.yml`                 | Common commands (`task up`, `task build`, `task check`, `task gscan`) |

## Acknowledgements

See [`NOTICE`](NOTICE) and [`docs/licensing.md`](docs/licensing.md). The theme is
a derivative work of the MIT-licensed original by Riccardo Graziosi (2020).

## License

MIT — see [`LICENSE`](LICENSE).
