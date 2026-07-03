#!/usr/bin/env bash
# Copy OSS + Stripe billing Playwright reports (per-test videos) into artifacts.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${E2E_BILLING_ARTIFACTS_DIR:-/opt/cursor/artifacts/e2e/billing}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$DEST/run-$TIMESTAMP"

mkdir -p "$OUT/oss/videos" "$OUT/oss/screenshots" "$OUT/oss/traces"
mkdir -p "$OUT/stripe/videos" "$OUT/stripe/screenshots" "$OUT/stripe/traces"

copy_results() {
  local src="$1"
  local label="$2"
  local out_videos="$OUT/$label/videos"
  local out_shots="$OUT/$label/screenshots"
  local out_traces="$OUT/$label/traces"

  if [[ ! -d "$src" ]]; then
    echo "e2e-billing-artifacts: skip missing $src"
    return 0
  fi

  while IFS= read -r -d '' file; do
    cp "$file" "$out_shots/"
  done < <(find "$src" -type f \( -name '*.png' -o -name '*.jpeg' -o -name '*.jpg' \) -print0 2>/dev/null || true)

  while IFS= read -r -d '' file; do
    cp "$file" "$out_videos/"
  done < <(find "$src" -type f -name '*.webm' -print0 2>/dev/null || true)

  while IFS= read -r -d '' file; do
    cp "$file" "$out_traces/"
  done < <(find "$src" -type f -name 'trace.zip' -print0 2>/dev/null || true)
}

copy_results "$ROOT/e2e/report/billing-oss-results" "oss"
copy_results "$ROOT/e2e/report/billing-stripe-results" "stripe"

if [[ -d "$ROOT/e2e/report/billing-oss-html" ]]; then
  cp -a "$ROOT/e2e/report/billing-oss-html" "$OUT/oss/html-report"
fi
if [[ -d "$ROOT/e2e/report/billing-stripe-html" ]]; then
  cp -a "$ROOT/e2e/report/billing-stripe-html" "$OUT/stripe/html-report"
fi
if [[ -f "$ROOT/e2e/billing-hub.html" ]]; then
  sed \
    -e 's|billing-oss-html|oss/html-report|g' \
    -e 's|billing-stripe-html|stripe/html-report|g' \
    "$ROOT/e2e/billing-hub.html" > "$OUT/billing-hub.html"
fi

mkdir -p "$DEST"
ln -sfn "$OUT" "$DEST/latest"

echo "Billing E2E artifacts: $OUT"
echo "  Hub:       file://$OUT/billing-hub.html"
echo "  OSS:       file://$OUT/oss/html-report/index.html"
echo "  Stripe:    file://$OUT/stripe/html-report/index.html"
echo "Latest:      $DEST/latest"
