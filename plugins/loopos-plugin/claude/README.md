# Claude packaging notes

LoopOS Plugin reuses the same portable Agent Skill at `../skills/loopos-mcp`.

## Claude Code

For local dogfood, make the skill available to Claude Code through a project or personal skills directory, or through a Claude Code plugin wrapper when that packaging is finalized.

Recommended local project test:

```bash
mkdir -p .claude/skills
ln -s /workspace/plugins/loopos-plugin/skills/loopos-mcp .claude/skills/loopos-mcp
```

Then ask Claude Code to use the `loopos-mcp` skill.

## MCP connection

Use the hosted LoopOS MCP endpoint when available. For local dogfood, use:

```txt
http://127.0.0.1:3001/api/mcp
```

Local smoke auth is documented in `../skills/loopos-mcp/references/auth.md`.

## MCPB status

Claude Desktop MCPB packaging is not part of the initial Phase 4 implementation. Treat it as an optional packaging target after the Cursor and Codex flows are stable.
