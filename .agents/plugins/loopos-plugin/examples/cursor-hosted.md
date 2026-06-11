# Cursor hosted MCP (OAuth)

Use this flow when LoopOS MCP is deployed (production/staging). OAuth is handled by Cursor — do not put bearer tokens in `mcp.json`.

## Prerequisites

Deployed LoopOS MCP with:

- `MCP_RESOURCE_URL=https://<mcp-host>/api/mcp`
- `NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co` (+ anon key)
- Supabase Auth → URL configuration: redirect URLs include MCP origin and `cursor://anysphere.cursor-mcp/oauth/callback` if using static client registration
- `[auth.oauth_server] enabled = true` on the Supabase project

## Cursor dashboard (recommended)

1. Open **Cursor Settings → Tools & MCP**.
2. **Add MCP server** (or edit project `.cursor/mcp.json` for the team):

```json
{
  "mcpServers": {
    "loopos": {
      "url": "https://<mcp-host>/api/mcp"
    }
  }
}
```

Do **not** add `headers.Authorization` for OAuth — Cursor manages tokens.

3. Click **Connect** on the server → browser OAuth → approve.
4. Confirm tools appear (e.g. `list_action_contracts`, `find_instruction`).
5. Confirm the `loopos-mcp` skill is available (plugin install or `.cursor/skills/loopos-mcp`).

## Verify deployment before connecting

From the monorepo root (replace host):

```bash
MCP_RESOURCE_URL=https://<mcp-host>/api/mcp \
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co \
./scripts/verify-mcp-oauth.sh https://<mcp-host>
```

## Smoke after OAuth

Ask the agent:

```txt
Use loopos-mcp: call list_action_contracts, then find_instruction for "document creation".
```

## Local vs hosted

| | Local dogfood | Hosted (this doc) |
|---|---|---|
| MCP URL | `http://127.0.0.1:3001/api/mcp` | `https://<mcp-host>/api/mcp` |
| Auth | `LOOPOS_MCP_TOKEN` / smoke bearer | Cursor OAuth |
| `mcp.json` headers | `Bearer ${LOOPOS_MCP_TOKEN}` OK | **No** Authorization header |
