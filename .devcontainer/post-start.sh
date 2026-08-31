#!/usr/bin/env bash
# Runs every time the Codespace/devcontainer starts (including resumes).
# Idempotent: only applies migrations that aren't already recorded as applied.
set -euo pipefail
cd /workspace

bash .devcontainer/wait-for-db.sh
npx prisma migrate deploy
