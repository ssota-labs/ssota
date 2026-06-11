# SSOTA Plugin

SSOTA Plugin teaches coding agents how to use SSOTA MCP safely and consistently. It packages a portable Agent Skill plus platform wrappers for Cursor, Codex, and Claude.

Phase 4 keeps this plugin inside the SSOTA monorepo at `plugins/ssota-plugin/`. A separate public repository can be reconsidered when marketplace submission is ready.

## What this plugin provides

- A portable `ssota-mcp` Agent Skill (**Root Runtime Protocol** — intent routing, MCP safety, self-check).
- Cursor plugin metadata and MCP config examples.
- Codex metadata for MCP dependency discovery.
- Claude packaging notes for reusing the same skill core.
- Smoke workflow documentation for local SSOTA MCP dogfood.

## Repository layout

```txt
plugins/ssota-plugin/
  README.md
  .cursor-plugin/
    plugin.json
  mcp.json
  skills/
    ssota-mcp/
      SKILL.md
      references/
        auth.md
        routing.md
        tools.md
        workflows.md
        result-handling.md
  agents/
    openai.yaml
  claude/
    README.md
  examples/
    cursor-local.md
    codex-local.md
    claude-local.md
    smoke-workflow.md
  docs/
    marketplace-checklist.md
    privacy.md
    security.md
    release.md
```

## Local dogfood

1. Prepare SSOTA locally from the monorepo root.

   ```bash
   export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 24
   pnpm cloud:prepare
   ```

2. Start the MCP app in a long-running shell or tmux session.

   ```bash
   pnpm dev --filter mcp
   ```

3. Workspace install copies already live at:

   - `.cursor/plugins/local/ssota-plugin/` — full plugin bundle (Cursor install path)
   - `.agents/plugins/ssota-plugin/` — full plugin bundle
   - `.agents/skills/ssota-mcp`, `.cursor/skills/ssota-mcp`, `.cursor/mcp.json` — materialized skill + MCP config

   When you edit this plugin, update all of those copies in the same PR.

4. Optionally install into the Cursor user plugin directory:

   ```bash
   mkdir -p ~/.cursor/plugins/local
   ln -s /workspace/plugins/ssota-plugin ~/.cursor/plugins/local/ssota-plugin
   ```

5. Reload Cursor and enable the SSOTA MCP server in settings.

See `examples/cursor-local.md` and `examples/smoke-workflow.md` for details.

## Safety rules

- The `ssota-mcp` skill is the Root Protocol; domain instructions live in SSOTA.
- SSOTA MCP is the only mutation interface.
- All SSOTA mutations must go through MCP `execute_action`.
- Treat `approve_gate` as Human-only.
- Do not commit access tokens, `.env` files, or user credentials.
- Use smoke auth only for local dogfood; hosted deployments should use OAuth.
