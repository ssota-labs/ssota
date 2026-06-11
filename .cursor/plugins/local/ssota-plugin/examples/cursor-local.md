# Cursor local install

Use this flow to dogfood SSOTA Plugin from the monorepo before marketplace publication.

## Prerequisites

- Cursor is installed.
- SSOTA MCP is running locally at `http://127.0.0.1:3001/api/mcp`.
- A local bearer token is available as `SSOTA_MCP_TOKEN`.

## Install

### Monorepo dogfood (project skills + MCP)

The repo already contains marketplace-style copies:

- `.agents/skills/ssota-mcp`
- `.cursor/skills/ssota-mcp`
- `.cursor/mcp.json`

When you change `plugins/ssota-plugin/`, update those copies in the same PR.

### Cursor user plugin directory (desktop IDE)

From any shell on the local machine:

```bash
mkdir -p ~/.cursor/plugins/local
ln -s /workspace/plugins/ssota-plugin ~/.cursor/plugins/local/ssota-plugin
```

Reload Cursor after creating the symlink.

## Configure MCP token

The committed `mcp.json` uses this placeholder:

```txt
${SSOTA_MCP_TOKEN}
```

Set the token locally through your shell or Cursor MCP configuration mechanism. Do not commit tokens into this repository.

## Verify

1. Open Cursor Settings.
2. Go to the MCP settings area.
3. Confirm `ssota-local` appears.
4. Confirm the `ssota-mcp` skill is available.
5. Ask the agent to use SSOTA MCP to call a read tool such as `list_action_contracts`.

## Cleanup

```bash
rm ~/.cursor/plugins/local/ssota-plugin
```
