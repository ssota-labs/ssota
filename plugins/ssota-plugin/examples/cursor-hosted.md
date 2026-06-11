# Cursor hosted MCP (OAuth)

Use this flow when SSOTA MCP is deployed (production/staging). OAuth is handled by Cursor — do not put bearer tokens in `mcp.json`.

## Two MCP endpoints (Supabase-style)

| Endpoint | URL pattern | Tools |
|---|---|---|
| **Account** | `https://<mcp-host>/api/mcp` | `list_organizations`, `list_projects`, `get_project` |
| **Project** | `https://<mcp-host>/api/mcp/<orgSlug>/<projectSlug>` | Graph/catalog/action tools (`execute_action`, `query_nodes`, …) |

Project scope is in the **URL only** — no `X-SSOTA-Project-Id` header in Cursor config.

Example (ssota-labs / ssota-dev):

```json
{
  "mcpServers": {
    "ssota": {
      "url": "https://mcp.ssota.ai/api/mcp/ssota-labs/ssota-dev"
    }
  }
}
```

To discover projects first, add a separate account server:

```json
{
  "mcpServers": {
    "ssota-account": {
      "url": "https://mcp.ssota.ai/api/mcp"
    },
    "ssota-dev": {
      "url": "https://mcp.ssota.ai/api/mcp/ssota-labs/ssota-dev"
    }
  }
}
```

## Prerequisites

Deployed SSOTA MCP with:

- `MCP_RESOURCE_URL=https://<mcp-host>/api/mcp` (account PRM default; project PRM uses `?org=&project=` query)
- `NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co` (+ anon key)
- Supabase Auth → **Site URL** = console origin (e.g. `https://www.ssota.ai`) — OAuth consent is `{Site URL}/oauth/consent` on the **web** app, not the MCP host
- Redirect URLs: console origin, MCP origin, `cursor://anysphere.cursor-mcp/oauth/callback`, and Cloud Agent callbacks (`https://cursor.com/agents/mcp/oauth/callback`, `https://www.cursor.com/agents/mcp/oauth/callback`)
- `[auth.oauth_server] enabled = true` on the Supabase project

## Cursor dashboard (recommended)

1. Open **Cursor Settings → Tools & MCP**.
2. Add the **project-scoped** MCP URL (org/project slugs from Console URL).
3. Do **not** add `headers.Authorization` for OAuth — Cursor manages tokens.
4. Click **Connect** → browser OAuth → approve on `{Site URL}/oauth/consent`.
5. Confirm project tools appear (`list_action_contracts`, `find_instruction`, …).
6. Confirm the `ssota-mcp` skill is available (plugin install or `.cursor/skills/ssota-mcp`).

## Verify deployment before connecting

From the monorepo root (replace host and slugs):

```bash
MCP_RESOURCE_URL=https://<mcp-host>/api/mcp \
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co \
./scripts/verify-mcp-oauth.sh https://<mcp-host> ssota-labs ssota-dev
```

## Smoke after OAuth

Ask the agent:

```txt
Use ssota-mcp: call list_action_contracts, then find_instruction for "document creation".
```

## Local vs hosted

| | Local dogfood | Hosted (this doc) |
|---|---|---|
| Account MCP URL | `http://127.0.0.1:3001/api/mcp` | `https://<mcp-host>/api/mcp` |
| Project MCP URL | `http://127.0.0.1:3001/api/mcp/ssota-labs/ssota-dev` | `https://<mcp-host>/api/mcp/<org>/<project>` |
| Auth | `SSOTA_MCP_TOKEN` / smoke bearer | Cursor OAuth |
| `mcp.json` headers | `Bearer ${SSOTA_MCP_TOKEN}` on project URL only | **No** Authorization header |
