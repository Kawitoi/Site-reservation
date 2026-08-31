#!/usr/bin/env bash
# Blocks until the `db` service accepts TCP connections on 5432, or times out.
set -euo pipefail

for _ in $(seq 1 60); do
  if node -e "require('net').connect(5432,'db').on('connect',()=>process.exit(0)).on('error',()=>process.exit(1))" 2>/dev/null; then
    exit 0
  fi
  sleep 1
done

echo "Timed out waiting for the db service." >&2
exit 1
