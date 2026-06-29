#!/usr/bin/env bash
# Serve Playwright billing HTML reports (videos work via local HTTP, not file://).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="${1:-hub}"
PORT_OSS="${BILLING_REPORT_PORT_OSS:-9324}"
PORT_STRIPE="${BILLING_REPORT_PORT_STRIPE:-9325}"
PORT_HUB="${BILLING_REPORT_PORT_HUB:-9323}"

cd "$ROOT/e2e"

case "$TARGET" in
  hub)
    echo "Billing hub: http://127.0.0.1:$PORT_HUB/billing-hub.html"
    exec pnpm exec playwright show-report report --port "$PORT_HUB"
    ;;
  oss)
    echo "OSS billing report: http://127.0.0.1:$PORT_OSS"
    exec pnpm exec playwright show-report report/billing-oss-html --port "$PORT_OSS"
    ;;
  stripe)
    echo "Stripe billing report: http://127.0.0.1:$PORT_STRIPE"
    exec pnpm exec playwright show-report report/billing-stripe-html --port "$PORT_STRIPE"
    ;;
  *)
    echo "Usage: $0 [hub|oss|stripe]"
    exit 1
    ;;
esac
