#!/usr/bin/env bash
# Smoke-check LoopOS MCP OAuth surface (local or hosted).
# Usage: ./scripts/verify-mcp-oauth.sh https://mcp.example.com
set -euo pipefail

BASE="${1:-http://127.0.0.1:3001}"
RESOURCE_URL="${MCP_RESOURCE_URL:-${BASE%/}/api/mcp}"
ORIGIN="$(python3 -c "from urllib.parse import urlparse; print(urlparse('${RESOURCE_URL}').scheme + '://' + urlparse('${RESOURCE_URL}').netloc)")"
METADATA_URL="${ORIGIN}/.well-known/oauth-protected-resource"
SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-}"

pass() { printf '  ✓ %s\n' "$1"; }
fail() { printf '  ✗ %s\n' "$1"; exit 1; }

echo "LoopOS MCP OAuth verification"
echo "  MCP resource : ${RESOURCE_URL}"
echo "  Metadata URL : ${METADATA_URL}"
echo

echo "1. Protected resource metadata"
META="$(curl -fsS "${METADATA_URL}")"
echo "${META}" | python3 -c "
import json, sys
d = json.load(sys.stdin)
assert 'resource' in d and '/api/mcp' in d['resource'], d
assert d['authorization_servers'], d
print('  resource:', d['resource'])
print('  authorization_servers:', d['authorization_servers'])
"
pass "metadata JSON valid"

echo "2. Unauthenticated MCP returns 401 + resource_metadata"
HEADERS="$(curl -sS -D - -o /dev/null -X POST "${RESOURCE_URL}" \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","method":"initialize","id":1}')"
echo "${HEADERS}" | grep -qi '401' || fail "expected HTTP 401"
echo "${HEADERS}" | grep -qi 'www-authenticate:.*resource_metadata' || fail "missing WWW-Authenticate resource_metadata"
echo "${HEADERS}" | grep -qi "resource_metadata=\"${METADATA_URL}\"" || fail "resource_metadata URL mismatch (expected ${METADATA_URL})"
pass "401 challenge points to metadata endpoint"

echo "3. OAuth consent UI"
CODE="$(curl -sS -o /dev/null -w '%{http_code}' "${ORIGIN}/oauth/consent")"
[[ "${CODE}" == "200" ]] || fail "oauth/consent returned ${CODE}"
pass "oauth/consent reachable"

if [[ -n "${SUPABASE_URL}" ]]; then
  echo "4. Supabase authorization server metadata"
  AS_META="$(curl -fsS "${SUPABASE_URL}/auth/v1/.well-known/oauth-authorization-server")"
  echo "${AS_META}" | python3 -c "
import json, sys
d = json.load(sys.stdin)
for k in ('issuer', 'authorization_endpoint', 'token_endpoint', 'registration_endpoint'):
    assert d.get(k), f'missing {k}'
print('  issuer:', d['issuer'])
print('  registration_endpoint:', d['registration_endpoint'])
"
  pass "Supabase OAuth AS metadata valid"
else
  echo "4. Supabase AS metadata — skipped (set NEXT_PUBLIC_SUPABASE_URL to verify)"
fi

echo
echo "All checks passed."
