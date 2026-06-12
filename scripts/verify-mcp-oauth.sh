#!/usr/bin/env bash
# Smoke-check SSOTA MCP OAuth surface (local or hosted).
# Usage: ./scripts/verify-mcp-oauth.sh https://mcp.example.com [orgSlug] [projectSlug] [orgSlug] [projectSlug]
set -euo pipefail

BASE="${1:-http://127.0.0.1:3001}"
ORG_SLUG="${2:-}"
PROJECT_SLUG="${3:-}"
ACCOUNT_RESOURCE_URL="${MCP_RESOURCE_URL:-${BASE%/}/api/mcp}"
ORIGIN="$(python3 -c "from urllib.parse import urlparse; print(urlparse('${ACCOUNT_RESOURCE_URL}').scheme + '://' + urlparse('${ACCOUNT_RESOURCE_URL}').netloc)")"
ACCOUNT_METADATA_URL="${ORIGIN}/.well-known/oauth-protected-resource"
SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-}"

if [[ -n "${ORG_SLUG}" && -n "${PROJECT_SLUG}" ]]; then
  PROJECT_RESOURCE_URL="${ORIGIN}/api/mcp?org=${ORG_SLUG}&project=${PROJECT_SLUG}"
  PROJECT_METADATA_URL="${ORIGIN}/.well-known/oauth-protected-resource?org=${ORG_SLUG}&project=${PROJECT_SLUG}"
else
  PROJECT_RESOURCE_URL=""
  PROJECT_METADATA_URL=""
fi

pass() { printf '  ✓ %s\n' "$1"; }
fail() { printf '  ✗ %s\n' "$1"; exit 1; }

echo "SSOTA MCP OAuth verification"
echo "  Account MCP  : ${ACCOUNT_RESOURCE_URL}"
if [[ -n "${PROJECT_RESOURCE_URL}" ]]; then
  echo "  Project MCP  : ${PROJECT_RESOURCE_URL}"
fi
echo

echo "1. Account protected resource metadata"
META="$(curl -fsS "${ACCOUNT_METADATA_URL}")"
echo "${META}" | python3 -c "
import json, sys
d = json.load(sys.stdin)
assert 'resource' in d and d['resource'].endswith('/api/mcp'), d
servers = d.get('authorization_servers') or []
assert servers, d
issuer = servers[0].rstrip('/')
assert issuer.endswith('/auth/v1'), f'authorization_servers[0] must be Supabase issuer (/auth/v1), got {servers[0]!r}'
print('  resource:', d['resource'])
print('  authorization_servers:', servers)
"
pass "account metadata JSON valid"

if [[ -n "${PROJECT_RESOURCE_URL}" ]]; then
  echo "2. Project protected resource metadata"
  PROJECT_META="$(curl -fsS "${PROJECT_METADATA_URL}")"
  PROJECT_RESOURCE_URL="${PROJECT_RESOURCE_URL}" PROJECT_META="${PROJECT_META}" python3 -c "
import json, os
d = json.loads(os.environ['PROJECT_META'])
expected = os.environ['PROJECT_RESOURCE_URL']
assert d.get('resource') == expected, f\"resource mismatch: {d.get('resource')!r} != {expected!r}\"
print('  resource:', d['resource'])
"
  pass "project metadata JSON valid"
else
  echo "2. Project metadata — skipped (pass orgSlug + projectSlug to verify)"
fi

echo "3. Unauthenticated account MCP returns 401 + resource_metadata"
HEADERS="$(curl -sS -D - -o /dev/null -X POST "${ACCOUNT_RESOURCE_URL}" \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","method":"initialize","id":1}')"
echo "${HEADERS}" | grep -qi '401' || fail "expected HTTP 401 on account MCP"
echo "${HEADERS}" | grep -qi 'www-authenticate:.*resource_metadata' || fail "missing WWW-Authenticate resource_metadata"
pass "account MCP 401 challenge present"

if [[ -n "${PROJECT_RESOURCE_URL}" ]]; then
  echo "4. Unauthenticated project MCP returns 401"
  PROJECT_HEADERS="$(curl -sS -D - -o /dev/null -X POST "${PROJECT_RESOURCE_URL}" \
    -H 'Content-Type: application/json' \
    -d '{"jsonrpc":"2.0","method":"initialize","id":1}')"
  echo "${PROJECT_HEADERS}" | grep -qi '401' || fail "expected HTTP 401 on project MCP"
  pass "project MCP 401 challenge present"
  CONSENT_STEP=5
else
  CONSENT_STEP=4
fi

echo "${CONSENT_STEP}. OAuth consent UI"
CODE="$(curl -sS -o /dev/null -w '%{http_code}' "${ORIGIN}/oauth/consent")"
[[ "${CODE}" == "200" ]] || fail "oauth/consent returned ${CODE}"
pass "oauth/consent reachable"

if [[ -n "${SUPABASE_URL}" ]]; then
  echo "$((CONSENT_STEP + 1)). Supabase authorization server metadata"
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

  echo "$((CONSENT_STEP + 2)). PRM authorization_servers matches Supabase issuer"
  PRM_META="${META}" AS_META="${AS_META}" python3 -c "
import json, os
meta = json.loads(os.environ['PRM_META'])
as_meta = json.loads(os.environ['AS_META'])
prm_issuer = meta['authorization_servers'][0].rstrip('/')
as_issuer = as_meta['issuer'].rstrip('/')
assert prm_issuer == as_issuer, f'issuer mismatch: PRM={prm_issuer!r} AS={as_issuer!r}'
print('  matched issuer:', prm_issuer)
"
  pass "authorization_servers matches Supabase issuer"
else
  echo "$((CONSENT_STEP + 1)). Supabase AS metadata — skipped (set NEXT_PUBLIC_SUPABASE_URL to verify)"
fi

echo
echo "All checks passed."
