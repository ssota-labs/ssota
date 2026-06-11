#!/usr/bin/env bash
# Replicate a LoopOS Plugin marketplace install inside this monorepo.
# Source of truth: plugins/loopos-plugin/ (the deployable plugin bundle).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLUGIN_DIR="$ROOT_DIR/plugins/loopos-plugin"
SKILL_SRC="$PLUGIN_DIR/skills/loopos-mcp"
MCP_SRC="$PLUGIN_DIR/mcp.json"

AGENTS_SKILL="$ROOT_DIR/.agents/skills/loopos-mcp"
CURSOR_SKILL="$ROOT_DIR/.cursor/skills/loopos-mcp"
CURSOR_MCP="$ROOT_DIR/.cursor/mcp.json"

usage() {
  cat <<'EOF'
Usage: scripts/install-loopos-plugin.sh [options]

Replicate plugins/loopos-plugin into agent skill paths and Cursor MCP config.

Options:
  --copy       Copy files instead of symlinking (closer to a real download)
  -h, --help   Show this help
EOF
}

log() {
  printf '[install-loopos-plugin] %s\n' "$*"
}

MODE="symlink"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --copy)
      MODE="copy"
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

if [[ ! -d "$SKILL_SRC" ]]; then
  echo "Plugin skill not found: $SKILL_SRC" >&2
  exit 1
fi

if [[ ! -f "$MCP_SRC" ]]; then
  echo "Plugin MCP config not found: $MCP_SRC" >&2
  exit 1
fi

relative_path() {
  local from="$1"
  local to="$2"
  python3 -c 'import os, sys; print(os.path.relpath(sys.argv[2], start=os.path.dirname(sys.argv[1])))' "$from" "$to"
}

install_path() {
  local src="$1"
  local dest="$2"

  if [[ -L "$dest" || -e "$dest" ]]; then
    rm -rf "$dest"
  fi

  mkdir -p "$(dirname "$dest")"

  if [[ "$MODE" == "copy" ]]; then
    cp -a "$src" "$dest"
    log "Copied $src -> $dest"
  else
    local link_target
    link_target="$(relative_path "$dest" "$src")"
    ln -s "$link_target" "$dest"
    log "Linked $dest -> $link_target"
  fi
}

main() {
  log "Installing LoopOS Plugin ($MODE mode)"
  install_path "$SKILL_SRC" "$AGENTS_SKILL"
  install_path "$SKILL_SRC" "$CURSOR_SKILL"
  install_path "$MCP_SRC" "$CURSOR_MCP"
  log "Done."
  log "  skill: .agents/skills/loopos-mcp"
  log "  skill: .cursor/skills/loopos-mcp"
  log "  mcp:   .cursor/mcp.json"
}

main "$@"
