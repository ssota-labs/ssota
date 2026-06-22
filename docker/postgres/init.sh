#!/bin/bash
# Runs once on first Postgres init (mounted into docker-entrypoint-initdb.d).
# Applies the auth-schema shim, then every SQL migration in order.
set -euo pipefail

psql_run() {
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$1"
}

echo "[ssota] applying self-host auth shim"
psql_run /shim.sql

echo "[ssota] applying migrations"
for f in /migrations/*.sql; do
  echo "[ssota] -> $(basename "$f")"
  psql_run "$f"
done

echo "[ssota] database ready"
