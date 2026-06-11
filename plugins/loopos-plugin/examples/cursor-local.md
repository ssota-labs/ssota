# Cursor local install

Use this flow to dogfood LoopOS Plugin from the monorepo before marketplace publication.

## Prerequisites

- Cursor is installed.
- LoopOS MCP is running locally at `http://127.0.0.1:3001/api/mcp`.
- A local bearer token is available as `LOOPOS_MCP_TOKEN`.

## Install

### Monorepo dogfood (project skills + MCP)

The repo already contains marketplace-style install copies:

- `.cursor/plugins/local/loopos-plugin/` — full plugin bundle
- `.agents/plugins/loopos-plugin/` — full plugin bundle
- `.agents/skills/loopos-mcp`, `.cursor/skills/loopos-mcp`, `.cursor/mcp.json` — skill + MCP config

When you change `plugins/loopos-plugin/`, update all of those copies in the same PR.

### Cursor user plugin directory (desktop IDE)

From any shell on the local machine:

```bash
mkdir -p ~/.cursor/plugins/local
ln -s /workspace/plugins/loopos-plugin ~/.cursor/plugins/local/loopos-plugin
```

Reload Cursor after creating the symlink.

## Configure MCP token

The committed `mcp.json` uses this placeholder:

```txt
${LOOPOS_MCP_TOKEN}
```

Set the token locally through your shell or Cursor MCP configuration mechanism. Do not commit tokens into this repository.

## Verify

1. Open Cursor Settings.
2. Go to the MCP settings area.
3. Confirm `loopos-local` appears.
4. Confirm the `loopos-mcp` skill is available.
5. Ask the agent to use LoopOS MCP to call a read tool such as `list_action_contracts`.

## Cleanup

```bash
rm ~/.cursor/plugins/local/loopos-plugin
```
