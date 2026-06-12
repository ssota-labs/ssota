# Cursor hosted MCP (OAuth)

Use this flow when SSOTA MCP is deployed (production/staging). OAuth is handled by Cursor — do not put bearer tokens in `mcp.json`.

## One MCP host, query params for project (Supabase-style)

All MCP traffic goes to **`https://<mcp-host>/api/mcp`** only.

| URL | Tools |
|---|---|
| `https://<mcp-host>/api/mcp` | `list_organizations`, `list_projects`, `get_project` |
| `https://<mcp-host>/api/mcp?org=<orgSlug>&project=<projectSlug>` | Graph/catalog/action tools |

Project scope is in the **URL query string** — no path segments, no headers.

Example:

```json
{
  "mcpServers": {
    "ssota": {
      "url": "https://mcp.ssota.ai/api/mcp?org=ssota-labs&project=ssota-dev"
    }
  }
}
```

To discover projects first, add a second entry without query params:

```json
{
  "mcpServers": {
    "ssota-account": {
      "url": "https://mcp.ssota.ai/api/mcp"
    },
    "ssota-dev": {
      "url": "https://mcp.ssota.ai/api/mcp?org=ssota-labs&project=ssota-dev"
    }
  }
}
```

## Prerequisites

- `MCP_RESOURCE_URL=https://<mcp-host>/api/mcp`
- Supabase Auth → **Site URL** = console origin (`https://www.ssota.ai`)
- Redirect URLs include `cursor://anysphere.cursor-mcp/oauth/callback` and Cloud Agent callbacks
- `[auth.oauth_server] enabled = true`

## Connect in Cursor

1. Set the **project URL** (with `?org=&project=`) in MCP settings.
2. Do **not** add `headers.Authorization` — Cursor manages OAuth tokens.
3. Connect → approve on `{Site URL}/oauth/consent`.
4. Confirm project tools appear (`list_action_contracts`, …).

## Verify deployment

```bash
MCP_RESOURCE_URL=https://<mcp-host>/api/mcp \
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co \
./scripts/verify-mcp-oauth.sh https://<mcp-host> ssota-labs ssota-dev
```

## Local vs hosted

| | Local | Hosted |
|---|---|---|
| Account | `http://127.0.0.1:3001/api/mcp` | `https://<mcp-host>/api/mcp` |
| Project | `http://127.0.0.1:3001/api/mcp?org=ssota-labs&project=ssota-dev` | same pattern on host |
