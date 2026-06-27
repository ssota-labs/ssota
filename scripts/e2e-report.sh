#!/usr/bin/env bash
# Run Playwright E2E, collect artifacts, and open the HTML report when interactive.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NO_REPORT=false
ARGS=()

for arg in "$@"; do
  case "$arg" in
    --no-report)
      NO_REPORT=true
      ;;
    *)
      ARGS+=("$arg")
      ;;
  esac
done

cd "$ROOT/e2e"

set +e
pnpm exec playwright test "${ARGS[@]}"
EXIT=$?
set -e

bash "$ROOT/scripts/e2e-artifacts.sh"

should_open_report=false
if [[ "$NO_REPORT" == false && -z "${CI:-}" && -z "${E2E_OPEN_REPORT:-}" ]]; then
  if [[ -n "${DISPLAY:-}" || "$(uname -s)" == "Darwin" ]]; then
    should_open_report=true
  fi
fi

if [[ "$should_open_report" == true ]]; then
  pnpm exec playwright show-report report/html || true
else
  echo "E2E HTML report: $ROOT/e2e/report/html/index.html"
  echo "Artifacts: ${E2E_ARTIFACTS_DIR:-/opt/cursor/artifacts/e2e}/latest"
  echo "Tip: open report locally with: pnpm --filter e2e exec playwright show-report report/html"
fi

exit $EXIT
