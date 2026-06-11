# Claude local usage

SSOTA Plugin reuses the portable `ssota-mcp` skill with Claude Code.

## Prerequisites

- Claude Code is installed.
- SSOTA MCP is running locally at `http://127.0.0.1:3001/api/mcp`.
- Authentication is configured through smoke auth or hosted OAuth.

## Project skill symlink

From the SSOTA monorepo root:

```bash
mkdir -p .claude/skills
ln -s /workspace/plugins/ssota-plugin/skills/ssota-mcp .claude/skills/ssota-mcp
```

Then start or reload Claude Code and ask it to use `ssota-mcp`.

## Prompt example

```txt
Use the ssota-mcp skill. Find the relevant SSOTA instruction, inspect the action contract, execute the appropriate SSOTA action, and verify the action log.
```

## Packaging note

Claude Desktop MCPB packaging is intentionally outside the first implementation pass. Use remote MCP or Claude Code skill/plugin paths first.
