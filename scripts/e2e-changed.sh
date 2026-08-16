#!/usr/bin/env bash
# Run Playwright only for added/modified spec files vs the merge base.
# Full suite: pnpm e2e / pnpm e2e:ci (verify:final).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BASE_REF="${E2E_CHANGED_BASE:-origin/main}"
if ! git rev-parse --verify "$BASE_REF" >/dev/null 2>&1; then
  if git rev-parse --verify origin/main >/dev/null 2>&1; then
    BASE_REF="origin/main"
  elif git rev-parse --verify main >/dev/null 2>&1; then
    BASE_REF="main"
  else
    echo "e2e:changed: cannot resolve merge base (tried ${E2E_CHANGED_BASE:-origin/main}, origin/main, main)" >&2
    exit 1
  fi
fi

collect_specs() {
  git diff --name-only --diff-filter=AM "$BASE_REF"...HEAD -- e2e/tests || true
  git diff --name-only --diff-filter=AM HEAD -- e2e/tests || true
  git diff --name-only --cached --diff-filter=AM -- e2e/tests || true
  git ls-files --others --exclude-standard -- e2e/tests || true
}

SPECS=()
while IFS= read -r path; do
  [[ -z "$path" ]] && continue
  case "$path" in
    *.spec.ts) ;;
    *) continue ;;
  esac
  rel="${path#e2e/}"
  if [[ -f "$ROOT/e2e/$rel" ]]; then
    SPECS+=("$rel")
  fi
done < <(collect_specs | awk 'NF' | sort -u)

if [[ ${#SPECS[@]} -eq 0 ]]; then
  echo "e2e:changed: no added/modified e2e spec files vs $BASE_REF — skip"
  echo "Shared helper-only changes: pass the related spec path, or run pnpm e2e:ci (verify:final)."
  exit 0
fi

echo "e2e:changed: running ${#SPECS[@]} spec(s) vs $BASE_REF:"
printf '  %s\n' "${SPECS[@]}"

if [[ "${1:-}" == "--list" ]]; then
  exit 0
fi

exec bash "$ROOT/scripts/e2e-report.sh" --no-report "${SPECS[@]}" "$@"
