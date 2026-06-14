# Smoke MCP workflow

Verify the SSOTA Plugin root skill + MCP read/write path.

## Prerequisites

```bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 24
pnpm cloud:prepare
pnpm dev --filter mcp
```

MCP URL: `http://127.0.0.1:3001/api/mcp` (project scope via tool params)

## Root skill sequence

1. Classify intent (read / create / update / …)
2. `find_workflow` → `get_workflow`
3. `get_action_contract`
4. Context: `query_nodes` / `get_node` as needed
5. `execute_action`
6. Verify: `get_action_log_entry` / `get_node`

## Minimum read flow

```txt
list_projects
find_workflow        { orgSlug, projectSlug, query }
get_workflow         { orgSlug, projectSlug, workflowId }
get_action_contract     { orgSlug, projectSlug, actionType }
get_node_type (optional)
```

## Minimum write flow

```txt
execute_action          { orgSlug, projectSlug, actionType, input }
  -> committed | gated | rejected
get_action_log_entry    { orgSlug, projectSlug, logId }
get_node                { orgSlug, projectSlug, nodeId }
```

## Graph context (optional)

```txt
query_neighbors
traverse_graph
```

## Success criteria

- Authenticated JSON-RPC works
- Domain instruction fetched before write
- Write uses `execute_action` only
- Outcome verified with fetch tools
- No secrets committed
