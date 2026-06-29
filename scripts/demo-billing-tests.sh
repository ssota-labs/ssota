#!/usr/bin/env bash
# Visual demo of the full billing test pipeline (for screen recordings).
set -euo pipefail

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
# shellcheck disable=SC1090
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm use 24 >/dev/null

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

section() {
  echo ""
  echo "════════════════════════════════════════════════════════════"
  echo "  $1"
  echo "════════════════════════════════════════════════════════════"
  echo ""
  sleep 1
}

section "1/5 — Billing scenario catalog (pnpm stripe:smoke)"
pnpm stripe:smoke 2>&1 | head -55
sleep 2

section "2/5 — Unit + integration (pnpm test:billing)"
pnpm test:billing
sleep 2

section "3/5 — OSS E2E BILLING=none (pnpm e2e:ci --grep billing)"
pnpm e2e:ci -- --grep billing
sleep 2

section "4/5 — Stripe-mode E2E (pnpm e2e:billing)"
pnpm e2e:billing
sleep 2

section "5/5 — Done"
echo "Artifacts:"
echo "  Playwright OSS:  e2e/report/html/index.html"
echo "  Playwright Stripe: e2e/report/billing-stripe-html/index.html"
echo "  E2E latest:      /opt/cursor/artifacts/e2e/latest/"
echo ""
echo "Live Checkout/Portal: STRIPE_E2E_LIVE=1 + agent-browser (manual tier)"
