# Smoke MCP workflow

Verify the SSOTA Plugin root skill + MCP workflow fetch + task/graph tools.

## Prerequisites

```bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 24
pnpm cloud:prepare
pnpm dev --filter mcp
```

MCP URL: `http://127.0.0.1:3001/api/mcp` (project scope via tool params)

## Root skill sequence

1. `list_projects` — discover `ssota-labs/ssota-dev`
2. `get_workflow_instruction` — `{ workflowKey: "agent.main" }`
3. `query_tasks` — `status: "ready"` (or per agent.main)
4. For each task: `get_workflow` → `get_workflow_instruction` for `task.workflowKey`
5. Execute workflow steps (`spawn_task`, `update_task`, graph tools as needed)

## Minimum workflow fetch

```txt
list_projects
get_workflow_instruction   { orgSlug, projectSlug, workflowKey: "agent.main" }
list_workflows             { orgSlug, projectSlug }
get_workflow               { orgSlug, projectSlug, workflowKey: "orchestrator.daily" }
get_workflow_instruction   { orgSlug, projectSlug, workflowKey: "work.implement_feature" }
```

## Minimum graph write

```txt
create_node    { orgSlug, projectSlug, nodeType, title, properties?, content? }
update_node    { orgSlug, projectSlug, nodeId, content }
create_edge    { orgSlug, projectSlug, edgeType, sourceNodeId, targetNodeId }
```

## Success criteria

- Authenticated JSON-RPC works
- `agent.main` instruction fetched from MCP (not local repo)
- Per-task workflow instruction fetched before execution
- Graph write round-trip succeeds
- No secrets committed
