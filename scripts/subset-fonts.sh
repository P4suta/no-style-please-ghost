#!/bin/sh
set -eu

fonts=theme/no-style-please-ghost/assets/fonts
for family in MPLUS1Code NotoSansJP NotoSerifJP; do
	uvx --from 'fonttools[woff]==4.68.0' pyftsubset "${fonts}/${family}.woff2" \
		--output-file="${fonts}/${family}.latin.woff2" --flavor=woff2 \
		--unicodes='U+0-24F,U+300-36F,U+1E00-1EFF,U+2000-206F,U+20AC,U+2122,U+2190-21FF,U+2212,U+FEFF,U+FFFD' \
		--layout-features='*' --name-IDs='*' --name-languages='*' --no-recalc-timestamp
done
