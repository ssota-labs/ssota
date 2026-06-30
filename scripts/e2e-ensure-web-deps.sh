#!/usr/bin/env bash
# Build apps/web workspace dependencies when dist/ is missing (fresh Cloud VM session).
# Playwright starts webServer before globalSetup, so this must run in the dev command.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MARKER="$ROOT/packages/agent-runtime/dist/index.js"

if [[ ! -f "$MARKER" ]]; then
  echo "[e2e] Workspace dist missing — building web dependencies (web^…)…" >&2
  (cd "$ROOT" && pnpm build --filter 'web^...')
fi

exec "$@"
