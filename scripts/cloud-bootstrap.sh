#!/usr/bin/env bash
# Cursor Cloud VM bootstrap — idempotent per session.
# Brings up Docker (legacy iptables + vfs), Supabase, DB seed, Playwright.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

INSTALL_DEPS=1
INSTALL_PLAYWRIGHT=1

usage() {
  cat <<'EOF'
Usage: scripts/cloud-bootstrap.sh [options]

Options:
  --skip-install       Skip pnpm install when node_modules exists
  --skip-playwright    Skip Playwright Chromium install
  -h, --help           Show this help
EOF
}

log() {
  printf '[cloud-bootstrap] %s\n' "$*"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-install)
      INSTALL_DEPS=0
      shift
      ;;
    --skip-playwright)
      INSTALL_PLAYWRIGHT=0
      shift
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

ensure_node() {
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  # shellcheck disable=SC1091
  if [[ -s "$NVM_DIR/nvm.sh" ]]; then
    . "$NVM_DIR/nvm.sh"
    nvm use 24 >/dev/null
    export PATH="$(dirname "$(nvm which 24)"):$PATH"
  fi

  local node_version
  node_version="$(node -v)"
  if [[ "${node_version#v}" != 24* ]]; then
    echo "Node 24 required (.nvmrc). Current: $node_version" >&2
    exit 1
  fi
  log "Node $node_version"
}

ensure_dependencies() {
  if [[ "$INSTALL_DEPS" == "0" ]]; then
    log "Skipping pnpm install (--skip-install)"
    return
  fi

  if [[ ! -d node_modules ]]; then
    log "Installing workspace dependencies…"
    pnpm install
    return
  fi

  log "node_modules present — skipping pnpm install"
}

ensure_env_files() {
  for app in web mcp; do
    local env_file="apps/$app/.env.local"
    local example="apps/$app/.env.example"
    if [[ ! -f "$env_file" && -f "$example" ]]; then
      cp "$example" "$env_file"
      log "Created $env_file from .env.example"
    fi
  done
}

ensure_iptables_legacy() {
  if ! command -v update-alternatives >/dev/null 2>&1; then
    log "update-alternatives not found — skipping iptables switch"
    return
  fi

  sudo update-alternatives --set iptables /usr/sbin/iptables-legacy
  sudo update-alternatives --set ip6tables /usr/sbin/ip6tables-legacy 2>/dev/null || true
  log "iptables backend set to legacy"
}

docker_ready() {
  docker info >/dev/null 2>&1 \
    && [[ "$(docker info --format '{{.Driver}}' 2>/dev/null || echo '')" == "vfs" ]]
}

ensure_docker() {
  if docker_ready; then
    log "Docker daemon already running (storage driver: vfs)"
    return
  fi

  log "Starting Docker daemon (vfs storage + legacy iptables)…"
  sudo pkill dockerd 2>/dev/null || true
  sudo pkill containerd 2>/dev/null || true
  sleep 2

  sudo mkdir -p /tmp/docker-vfs /tmp/docker-exec
  sudo dockerd \
    --storage-driver=vfs \
    --data-root=/tmp/docker-vfs \
    --exec-root=/tmp/docker-exec \
    --host=unix:///var/run/docker.sock \
    >/tmp/dockerd-vfs.log 2>&1 &

  local attempt
  for attempt in $(seq 1 30); do
    if docker_ready; then
      sudo chmod 666 /var/run/docker.sock 2>/dev/null || true
      log "Docker daemon ready"
      return
    fi
    sleep 1
  done

  log "Docker failed to start — see /tmp/dockerd-vfs.log"
  exit 1
}

ensure_supabase() {
  if pnpm exec supabase status >/dev/null 2>&1; then
    log "Supabase already running"
    return
  fi

  log "Starting Supabase local stack…"
  pnpm exec supabase start
}

ensure_database() {
  log "Applying migrations and seed…"
  pnpm db:migrate
  pnpm db:seed
}

ensure_playwright() {
  if [[ "$INSTALL_PLAYWRIGHT" == "0" ]]; then
    log "Skipping Playwright install (--skip-playwright)"
    return
  fi

  log "Ensuring Playwright Chromium…"
  pnpm --filter e2e exec playwright install chromium
}

main() {
  log "LoopOS Cloud bootstrap (session-local runtime)"
  ensure_node
  ensure_dependencies
  ensure_env_files
  ensure_iptables_legacy
  ensure_docker
  ensure_supabase
  ensure_database
  ensure_playwright
  log "Ready."
  log "Smoke: smoke@loopos.test / smoke-test-password-123"
  log "Next: pnpm e2e  |  pnpm test --filter @loopos/adapter-supabase"
}

main "$@"
