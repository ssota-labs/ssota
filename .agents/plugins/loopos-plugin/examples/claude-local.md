# Claude local usage

LoopOS Plugin reuses the portable `loopos-mcp` skill with Claude Code.

## Prerequisites

- Claude Code is installed.
- LoopOS MCP is running locally at `http://127.0.0.1:3001/api/mcp`.
- Authentication is configured through smoke auth or hosted OAuth.

## Project skill symlink

From the LoopOS monorepo root:

```bash
mkdir -p .claude/skills
ln -s /workspace/plugins/loopos-plugin/skills/loopos-mcp .claude/skills/loopos-mcp
```

Then start or reload Claude Code and ask it to use `loopos-mcp`.

## Prompt example

```txt
Use the loopos-mcp skill. Find the relevant LoopOS instruction, inspect the action contract, execute the appropriate LoopOS action, and verify the action log.
```

## Packaging note

Claude Desktop MCPB packaging is intentionally outside the first implementation pass. Use remote MCP or Claude Code skill/plugin paths first.
