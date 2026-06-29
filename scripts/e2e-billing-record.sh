#!/usr/bin/env bash
# Run billing E2E with per-test video; open Playwright HTML reports locally.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OPEN_REPORT=false
for arg in "$@"; do
  if [[ "$arg" == "--open" ]]; then OPEN_REPORT=true; fi
done

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
# shellcheck disable=SC1090
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm use 24 >/dev/null

cd "$ROOT/e2e"

mkdir -p report
cp "$ROOT/e2e/billing-hub.html" report/billing-hub.html

echo "═══ Billing OSS E2E (video per test) ═══"
pnpm exec playwright test -c playwright.billing-oss.config.ts

echo ""
echo "═══ Billing Stripe E2E (video per test) ═══"
pnpm exec playwright test -c playwright.billing.config.ts

bash "$ROOT/scripts/e2e-billing-artifacts.sh"

echo ""
echo "Reports (per-test Video tab in each test):"
echo "  file://$ROOT/e2e/report/billing-hub.html"
echo "  file://$ROOT/e2e/report/billing-oss-html/index.html"
echo "  file://$ROOT/e2e/report/billing-stripe-html/index.html"

if [[ "$OPEN_REPORT" == true ]]; then
  bash "$ROOT/scripts/e2e-billing-open-report.sh" hub
fi
