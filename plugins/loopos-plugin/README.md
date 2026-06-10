# LoopOS Plugin

LoopOS Plugin teaches coding agents how to use LoopOS MCP safely and consistently. It packages a portable Agent Skill plus platform wrappers for Cursor, Codex, and Claude.

Phase 4 keeps this plugin inside the LoopOS monorepo at `plugins/loopos-plugin/`. A separate public repository can be reconsidered when marketplace submission is ready.

## What this plugin provides

- A portable `loopos-mcp` Agent Skill.
- Cursor plugin metadata and MCP config examples.
- Codex metadata for MCP dependency discovery.
- Claude packaging notes for reusing the same skill core.
- Smoke workflow documentation for local LoopOS MCP dogfood.

## Repository layout

```txt
plugins/loopos-plugin/
  README.md
  .cursor-plugin/
    plugin.json
  mcp.json
  skills/
    loopos-mcp/
      SKILL.md
      references/
        auth.md
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

1. Prepare LoopOS locally from the monorepo root.

   ```bash
   export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 24
   pnpm cloud:prepare
   ```

2. Start the MCP app in a long-running shell or tmux session.

   ```bash
   pnpm dev --filter mcp
   ```

3. Install this plugin into Cursor locally.

   ```bash
   mkdir -p ~/.cursor/plugins/local
   ln -s /workspace/plugins/loopos-plugin ~/.cursor/plugins/local/loopos-plugin
   ```

4. Reload Cursor and enable the LoopOS MCP server in settings.

See `examples/cursor-local.md` and `examples/smoke-workflow.md` for details.

## Safety rules

- LoopOS MCP is the only mutation interface.
- All LoopOS mutations must go through MCP `execute_action`.
- Treat `approve_gate` as Human-only.
- Do not commit access tokens, `.env` files, or user credentials.
- Use smoke auth only for local dogfood; hosted deployments should use OAuth.
