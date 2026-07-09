# Security

SSOTA Plugin is designed to preserve SSOTA runtime invariants while giving agents a repeatable MCP workflow.

## Runtime invariants

- All SSOTA graph writes go through the typed MCP write tools — `create_node`, `update_node`, `create_edge` — plus page `actions` (`create_node`/`update_node`/`set_node_property`/`create_edge`/`delete_edge`/`delete_node`). There is no `execute_action`.
- SSOTA MCP is the only mutation interface for this plugin.
- The root runtime protocol lives in the `ssota-mcp` skill, not in graph instructions.
- Writes are validated server-side against the L1 catalog (`catalogKey`, `property_schema`, edge domain/range) before commit.
- For important writes, read the entity back (`get_node`, `traverse_edges`, `get_task`) to verify — there is no action log.

## Credential handling

- Do not commit tokens or credentials.
- Do not place real tokens in `mcp.json`.
- Use local environment configuration for smoke dogfood.
- Use OAuth for hosted deployments.

## MCP endpoint trust

Only connect this plugin to SSOTA MCP endpoints you trust. A configured MCP server can receive action inputs and read queries from the agent.

## Agent permissions

Agent-led meta changes (catalog/type and page/agent authoring) are lab-gated; treat these as high-risk:

- node type or edge type definition or breaking update (`create_node_type`, `create_edge_type`)
- page / agent / schedule authoring (`create_page`, `update_page`, `create_agent`, `create_schedule`)
- destructive deprecation or node/edge deletion (page `delete_node` / `delete_edge` actions)

When uncertain, prefer read tools first and keep catalog/type edits to lab-enabled scopes; do not fabricate writes. Graph writes go through `create_node`/`update_node`/`create_edge`, never a generic `execute_action`.
