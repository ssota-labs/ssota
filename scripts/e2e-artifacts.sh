#!/usr/bin/env bash
# Copy Playwright E2E report outputs into a stable artifacts directory for PRs and agents.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/e2e/report"
DEST="${E2E_ARTIFACTS_DIR:-/opt/cursor/artifacts/e2e}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$DEST/run-$TIMESTAMP"

if [[ ! -d "$SRC" ]]; then
  echo "e2e-artifacts: skip — no report dir at $SRC"
  exit 0
fi

mkdir -p "$OUT/screenshots" "$OUT/videos" "$OUT/traces"

if [[ -d "$SRC/test-results" ]]; then
  while IFS= read -r -d '' file; do
    cp "$file" "$OUT/screenshots/"
  done < <(find "$SRC/test-results" -type f \( -name '*.png' -o -name '*.jpeg' -o -name '*.jpg' \) -print0 2>/dev/null || true)

  while IFS= read -r -d '' file; do
    cp "$file" "$OUT/videos/"
  done < <(find "$SRC/test-results" -type f -name '*.webm' -print0 2>/dev/null || true)

  while IFS= read -r -d '' file; do
    cp "$file" "$OUT/traces/"
  done < <(find "$SRC/test-results" -type f -name 'trace.zip' -print0 2>/dev/null || true)
fi

if [[ -d "$SRC/html" ]]; then
  cp -a "$SRC/html" "$OUT/html-report"
fi

if [[ -f "$SRC/results.json" ]]; then
  cp "$SRC/results.json" "$OUT/"
fi

mkdir -p "$DEST"
ln -sfn "$OUT" "$DEST/latest"

echo "E2E artifacts copied to: $OUT"
echo "Latest symlink: $DEST/latest"
echo "Open HTML report: file://$OUT/html-report/index.html"
