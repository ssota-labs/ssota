#!/usr/bin/env bash
# SSOTA — merge Cursor Secrets (process.env) into per-app .env.local files.
# Keys are scoped by each app's .env.example manifest (active + commented declarations).
# Idempotent: preserves unrelated lines; only upserts keys present in process.env.
# Intended to run after sync-supabase-env.sh during cloud:prepare.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

APPS=(web mcp)

log() {
  printf '[materialize-env-from-secrets] %s\n' "$*"
}

main() {
  node -e "
    const fs = require('fs');
    const path = require('path');

    const root = process.argv[1];
    const apps = process.argv.slice(2);
    const keyPattern = /^\\s*#?\\s*([A-Za-z_][A-Za-z0-9_]*)\\s*=/;

    function declaredKeys(examplePath) {
      if (!fs.existsSync(examplePath)) return [];
      const keys = new Set();
      for (const line of fs.readFileSync(examplePath, 'utf8').split('\\n')) {
        const match = line.match(keyPattern);
        if (match) keys.add(match[1]);
      }
      return [...keys];
    }

    function upsertEnvFile(filePath, updates) {
      const dir = path.dirname(filePath);
      fs.mkdirSync(dir, { recursive: true });
      const existing = fs.existsSync(filePath)
        ? fs.readFileSync(filePath, 'utf8')
        : '';
      const lines = existing.length ? existing.split('\\n') : [];
      const seen = new Set();
      const out = [];

      for (const line of lines) {
        const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=/);
        if (!match) {
          out.push(line);
          continue;
        }
        const key = match[1];
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
        out.push('# --- materialized from Cursor Secrets (process.env) ---');
        for (const [key, value] of missing) {
          out.push(key + '=' + value);
        }
      }

      fs.writeFileSync(filePath, out.join('\\n').replace(/\\n+$/, '\\n'));
    }

    let total = 0;
    const summary = [];

    for (const app of apps) {
      const examplePath = path.join(root, 'apps', app, '.env.example');
      const envPath = path.join(root, 'apps', app, '.env.local');
      const keys = declaredKeys(examplePath);
      const updates = {};

      for (const key of keys) {
        const value = process.env[key];
        if (value === undefined || value === '') continue;
        updates[key] = value;
      }

      const count = Object.keys(updates).length;
      if (count === 0) {
        summary.push('  apps/' + app + '/.env.local: 0 keys (no matching process.env)');
        continue;
      }

      upsertEnvFile(envPath, updates);
      total += count;
      summary.push(
        '  apps/' + app + '/.env.local: ' +
          count + ' key(s) [' + Object.keys(updates).sort().join(', ') + ']',
      );
    }

    console.log('[materialize-env-from-secrets] Done — ' + total + ' key(s) across ' + apps.length + ' app(s)');
    for (const line of summary) console.log(line);
  " "$ROOT_DIR" "${APPS[@]}"
}

main "$@"
