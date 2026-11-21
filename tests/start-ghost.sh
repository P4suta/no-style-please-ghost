#!/bin/sh
set -eu

exec docker run --rm --init \
  --publish "127.0.0.1:${GHOST_TEST_PORT:-2468}:2368" \
  --tmpfs /var/lib/ghost/content:rw,uid=1000,gid=1000 \
  --env NODE_ENV=development \
  --env "url=http://127.0.0.1:${GHOST_TEST_PORT:-2468}/journal" \
  --env database__client=sqlite3 \
  --env database__connection__filename=/var/lib/ghost/content/data/readers.db \
  --env security__staffDeviceVerification=false \
  ghost:6-alpine
