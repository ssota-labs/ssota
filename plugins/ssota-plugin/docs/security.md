# Security

SSOTA Plugin is designed to preserve SSOTA runtime invariants while giving agents a repeatable MCP workflow.

## Runtime invariants

- All SSOTA writes must use MCP `execute_action`.
- SSOTA MCP is the only mutation interface for this plugin.
- The root runtime protocol lives in the `ssota-mcp` skill, not in graph instructions.
- Gate approval is Human-only unless SSOTA policy explicitly changes.
- Action log verification should be used for important writes.

## Credential handling

- Do not commit tokens or credentials.
- Do not place real tokens in `mcp.json`.
- Use local environment configuration for smoke dogfood.
- Use OAuth for hosted deployments.

## MCP endpoint trust

Only connect this plugin to SSOTA MCP endpoints you trust. A configured MCP server can receive action inputs and read queries from the agent.

## Agent permissions

Agent-led meta changes may be allowed by SSOTA policy, but high-risk changes should gate:

- action contract definition or breaking update
- node type and edge type mutation
- destructive deprecation
- gate approval

When uncertain, let SSOTA action policy decide by submitting through `execute_action` with a clear rationale.
