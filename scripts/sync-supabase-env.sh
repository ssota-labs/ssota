#!/usr/bin/env bash
# SSOTA — sync .env.local files from running local Supabase (supabase status).
# Idempotent: preserves app-specific keys (e.g. MCP_RESOURCE_URL) and updates Supabase keys.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

log() {
  printf '[sync-supabase-env] %s\n' "$*"
}

seed_from_example_if_missing() {
  local app="$1"
  local env_file="apps/$app/.env.local"
  local example="apps/$app/.env.example"
  if [[ ! -f "$env_file" && -f "$example" ]]; then
    cp "$example" "$env_file"
    log "Created $env_file from .env.example"
  fi
}

main() {
  seed_from_example_if_missing web
  seed_from_example_if_missing mcp

  local status_json
  if ! status_json="$(
    pnpm exec supabase status -o json 2>&1 | node -e "
      const chunks = [];
      process.stdin.on('data', (c) => chunks.push(c));
      process.stdin.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        const start = text.indexOf('{');
        if (start < 0) {
          console.error('supabase status JSON not found — is the local stack running?');
          process.exit(1);
        }
        const end = text.lastIndexOf('}');
        if (end < start) {
          console.error('supabase status JSON is incomplete');
          process.exit(1);
        }
        process.stdout.write(text.slice(start, end + 1));
      });
    "
  )"; then
    exit 1
  fi

  node -e "
    const fs = require('fs');
    const path = require('path');

    const raw = process.argv[1];
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start < 0 || end < start) {
      console.error('[sync-supabase-env] invalid supabase status JSON');
      process.exit(1);
    }
    const status = JSON.parse(raw.slice(start, end + 1));
    const root = process.argv[2];

    const updates = {
      NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: status.ANON_KEY,
      DATABASE_URL: status.DB_URL,
      SUPABASE_URL: status.API_URL,
      SUPABASE_ANON_KEY: status.ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY,
    };

    const required = ['API_URL', 'ANON_KEY', 'DB_URL', 'SERVICE_ROLE_KEY'];
    for (const key of required) {
      if (!status[key]) {
        console.error('[sync-supabase-env] missing ' + key + ' in supabase status');
        process.exit(1);
      }
    }

    function upsertEnvFile(filePath) {
      const dir = path.dirname(filePath);
      fs.mkdirSync(dir, { recursive: true });
      const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
      const lines = existing.length ? existing.split('\n') : [];
      const seen = new Set();
      const out = [];

      for (const line of lines) {
        const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=/);
        if (!m) {
          out.push(line);
          continue;
        }
        const key = m[1];
        if (key in updates) {
          out.push(key + '=' + updates[key]);
          seen.add(key);
        } else {
          out.push(line);
        }
      }

      const missing = Object.entries(updates).filter(([key]) => !seen.has(key));
      if (missing.length) {
        if (out.length && out[out.length - 1] !== '') out.push('');
        for (const [key, value] of missing) {
          out.push(key + '=' + value);
        }
      }

      fs.writeFileSync(filePath, out.join('\n').replace(/\n+$/, '\n'));
    }

    const targets = [
      path.join(root, 'apps/web/.env.local'),
      path.join(root, 'apps/mcp/.env.local'),
      path.join(root, '.env.local'),
    ];
    for (const file of targets) upsertEnvFile(file);

    console.log('[sync-supabase-env] Synced Supabase keys → apps/web/.env.local, apps/mcp/.env.local, .env.local');
    console.log('[sync-supabase-env]   NEXT_PUBLIC_SUPABASE_URL=' + updates.NEXT_PUBLIC_SUPABASE_URL);
    console.log('[sync-supabase-env]   DATABASE_URL=' + updates.DATABASE_URL);
  " "$status_json" "$ROOT_DIR"
}

main "$@"
