# Licensing

This repository is MIT-licensed. The theme under
`theme/no-style-please-ghost/` is a derivative work of the MIT-licensed
Jekyll theme [`riggraz/no-style-please`](https://github.com/riggraz/no-style-please)
(Copyright (c) 2020 Riccardo Graziosi).

## What the MIT license asks of us

> The above copyright notice and this permission notice shall be included
> in all copies or substantial portions of the Software.

To honour that requirement we keep the original copyright notice in:

- `NOTICE` — overall project attribution.
- `LICENSE` — mentions the derivative status.
- `theme/no-style-please-ghost/LICENSE` — dual copyright notice intended
  to travel with the theme when it is distributed as a zip via
  Ghost's admin UI.
- `theme/no-style-please-ghost/assets/css/style.css` — header comment
  with both copyrights so any snippet reuse carries attribution.

## Non-goals

- The REUSE spec or any other formal compliance framework.
- Retaining author email addresses or other contact information beyond
  what's already in public git history of the upstream project.
- Sub-licensing: we stay MIT to match the upstream's terms.

## When adding new files

1. If the file copies **any non-trivial bytes** from the upstream
   (CSS rules, HTML structure) — keep a short header comment crediting
   the original.
2. If the file is new to this port (Ghost-only helpers, workflows,
   Compose definitions) — no header needed; the repository-level
   `LICENSE` covers it.
