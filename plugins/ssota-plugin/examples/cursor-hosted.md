# Cursor hosted MCP (OAuth)

Use this flow when SSOTA MCP is deployed (production/staging). OAuth is handled by Cursor — do not put bearer tokens in `mcp.json`.

## Single MCP endpoint

All tools live on **`https://<mcp-host>/api/mcp`**.

Project scope is passed as **tool params** on every project-scoped call:

```json
{
  "orgSlug": "ssota-labs",
  "projectSlug": "ssota-dev",
  "query": "document creation"
}
```

The server validates user membership on each call.

```json
{
  "mcpServers": {
    "ssota": {
      "url": "https://mcp.ssota.ai/api/mcp"
    }
  }
}
```

## Workflow

1. Connect MCP (OAuth once).
2. `list_projects` → pick `orgSlug` + `projectSlug`.
3. Pass scope on every project tool (`find_workflow`, `execute_action`, …).

## Prerequisites

- `MCP_RESOURCE_URL=https://<mcp-host>/api/mcp`
- Supabase Auth → **Site URL** = console origin (`https://www.ssota.ai`)
- Redirect URLs include `cursor://anysphere.cursor-mcp/oauth/callback` and Cloud Agent callbacks
- `[auth.oauth_server] enabled = true`

## Connect in Cursor

1. Set the MCP URL to `https://<mcp-host>/api/mcp` (no query params).
2. Do **not** add `headers.Authorization` — Cursor manages OAuth tokens.
3. Connect → approve on `{Site URL}/oauth/consent`.
4. Confirm all tools appear (`list_projects`, `list_action_contracts`, `execute_action`, …).

## Verify deployment

```bash
MCP_RESOURCE_URL=https://<mcp-host>/api/mcp \
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co \
./scripts/verify-mcp-oauth.sh https://<mcp-host> ssota-labs ssota-dev
```

## Local vs hosted

| | Local | Hosted |
|---|---|---|
| MCP URL | `http://127.0.0.1:3001/api/mcp` | `https://<mcp-host>/api/mcp` |
| Project scope | `orgSlug` + `projectSlug` tool params | same |
