# Tools

Active MCP tools: account/project discovery, development workflow tasks, workflow instructions, and graph read/write.

Archived generic runtime tools (`execute_action`, gates, action log) are under `archive/generic-runtime`.

## Account

| Tool | Description |
|------|-------------|
| `list_organizations` | List organizations the user can access |
| `list_projects` | List projects in an organization |
| `get_project` | Fetch one project by org/project slug |

## Tasks (project-scoped)

| Tool | Description |
|------|-------------|
| `list_tasks` | List tasks (optional `limit`) |
| `query_tasks` | Filter by `status`, `workflowKey`, `assignee`, `subjectId`, `targetNodeId`, `executorType`, pagination |
| `get_task` | Fetch one task by `taskId` |
| `spawn_task` | Create task — `workflowKey` must exist in deployed registry |
| `update_task` | Patch task fields (`status`, `result`, `context`, etc.) |

### spawn_task input

- `title` (required)
- `workflowKey` (required) — discover via `list_workflows` or `get_workflow`
- `assignee`, `subjectId`, `targetNodeId`, `parentTaskId`, `executorType`
- `context`, `acceptanceCriteria`
- `idempotencyKey` — duplicate key returns existing task

## Workflows (project-scoped, global SSOT content)

| Tool | Description |
|------|-------------|
| `list_workflows` | List workflow metadata (no instruction body) |
| `get_workflow` | Fetch metadata for one `workflowKey` |
| `get_workflow_instruction` | Fetch full markdown instruction — start with `agent.main` |

## Graph (project-scoped)

| Tool | Description |
|------|-------------|
| `list_node_types` | Catalog node types |
| `get_node_type` | One node type entry |
| `list_edge_types` | Catalog edge types |
| `query_nodes` | Query nodes with filters |
| `get_node` | Fetch one node |
| `traverse_edges` | Traverse edges from a node |
| `create_node` | Create node (catalog-validated) |
| `update_node` | Patch node title/properties/content |
| `create_edge` | Connect two nodes with typed edge |

## REST (MCP app)

- `GET /api/v1/tasks` — list or query
- `POST /api/v1/tasks` — spawn
- `GET /api/v1/tasks/:taskId` — get
- `PATCH /api/v1/tasks/:taskId` — update

Auth: Bearer JWT. Project scope via tool args (`orgSlug`, `projectSlug`) or OAuth context.
