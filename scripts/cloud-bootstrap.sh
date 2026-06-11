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

ensure_build() {
  # 워크스페이스 라이브러리(contracts·core·adapter·client)를 빌드한다.
  # dist/는 git에 없고 세션 간 유지되지 않으므로, seed·통합 테스트·앱이
  # @loopos/core/dist 등을 import하기 전에 반드시 빌드되어 있어야 한다.
  log "Building workspace libraries (contracts/core/adapter/client)…"
  pnpm build --filter @ssota/adapter-supabase --filter @ssota/client
}

ensure_env_files() {
  for app in web mcp; do
    local env_file="apps/$app/.env.local"
    local example="apps/$app/.env.example"
    if [[ ! -f "$env_file" && -f "$example" ]]; then
      cp "$example" "$env_file"
      log "Created $env_file from .env.example (placeholder — synced after Supabase starts)"
    fi
  done
}

sync_supabase_env() {
  log "Syncing .env.local from local Supabase status…"
  bash "$ROOT_DIR/scripts/sync-supabase-env.sh"
}

ensure_docker_binaries() {
  if command -v docker >/dev/null 2>&1 && command -v dockerd >/dev/null 2>&1; then
    log "Docker binaries present"
    return
  fi

  if ! command -v apt-get >/dev/null 2>&1; then
    echo "Docker is not installed and apt-get is unavailable" >&2
    exit 1
  fi

  log "Installing Docker engine package (docker.io)…"
  sudo apt-get update
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y docker.io
}

ensure_iptables_legacy() {
  if ! command -v update-alternatives >/dev/null 2>&1; then
    log "update-alternatives not found — skipping iptables switch"
    return
  fi

  if ! sudo update-alternatives --query iptables >/dev/null 2>&1; then
    log "iptables alternatives not registered — skipping iptables switch"
    return
  fi

  sudo update-alternatives --set iptables /usr/sbin/iptables-legacy
  sudo update-alternatives --set ip6tables /usr/sbin/ip6tables-legacy 2>/dev/null || true
  log "iptables backend set to legacy"
}

docker_ready() {
  sudo chmod 666 /var/run/docker.sock 2>/dev/null || true
  docker info >/dev/null 2>&1 \
    && [[ "$(docker info --format '{{.Driver}}' 2>/dev/null || echo '')" == "vfs" ]]
}

ssota_docker_config() {
  # Cloud VM /etc/docker/daemon.json may pin overlayfs — isolate with our own config.
  local cfg="/tmp/ssota-docker-daemon.json"
  printf '%s\n' '{"storage-driver":"vfs"}' >"$cfg"
  echo "$cfg"
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

  local docker_config
  docker_config="$(ssota_docker_config)"
  if [[ -f /etc/docker/daemon.json ]]; then
    log "Using isolated Docker config ($docker_config) — system /etc/docker/daemon.json ignored"
  fi

  sudo mkdir -p /tmp/docker-vfs /tmp/docker-exec
  sudo dockerd \
    --config-file="$docker_config" \
    --data-root=/tmp/docker-vfs \
    --exec-root=/tmp/docker-exec \
    --host=unix:///var/run/docker.sock \
    >/tmp/dockerd-vfs.log 2>&1 &
  sudo chmod 666 /var/run/docker.sock 2>/dev/null || true

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
  log "SSOTA Cloud bootstrap (session-local runtime)"
  ensure_node
  ensure_dependencies
  ensure_build
  ensure_env_files
  ensure_docker_binaries
  ensure_iptables_legacy
  ensure_docker
  ensure_supabase
  sync_supabase_env
  ensure_database
  ensure_playwright
  log "Ready."
  log "Smoke: smoke@ssota.test / smoke-test-password-123"
  log "Next: pnpm e2e  |  pnpm test --filter @ssota/adapter-supabase"
}

main "$@"
