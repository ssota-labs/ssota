# Tools

Active MCP tools: account/project discovery, development workflow tasks, workflow instructions, graph read/write, catalog authoring, pages, and agents/schedules.

The legacy generic-runtime tools (`execute_action`, gates/`submit_for_approval`, action log/`get_action_log_entry`, `find_workflow`, `list_action_contracts`, `query_impact_queue`) were **removed** from the product — they are not live tools and are available in git history only. Graph writes go through `create_node`/`update_node`/`create_edge` and page `actions` (`create_node`/`update_node`/`set_node_property`/`create_edge`/`delete_edge`/`delete_node`).

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
| `get_edge_type` | One edge type entry |
| `search_catalog` | Search node/edge catalog entries |
| `query_nodes` | Query nodes with filters |
| `get_node` | Fetch one node |
| `traverse_edges` | Traverse edges from a node |
| `create_node` | Create node (catalog-validated) |
| `update_node` | Patch node title/properties/content |
| `create_edge` | Connect two nodes with typed edge |
| `create_node_type` | Author a catalog node type (Console v2.7, lab-gated) |
| `create_edge_type` | Author a catalog edge type (Console v2.7, lab-gated) |

## Pages (project-scoped)

| Tool | Description |
|------|-------------|
| `list_pages` | List L3 page nodes |
| `read_page` | Fetch one page spec + bindings |
| `list_page_components` | List L2 UI catalog components |
| `get_page_component` | One page component entry |
| `create_page` | Author a page (spec + bindings + actions) |
| `update_page` | Patch a page spec |

## Agents & schedules (project-scoped)

| Tool | Description |
|------|-------------|
| `list_agents` | List agent definitions |
| `get_agent` | Fetch one agent |
| `get_agent_instruction` | Fetch an agent's instruction body |
| `create_agent` | Author an agent |
| `list_schedules` | List schedules |
| `create_schedule` | Author a schedule (cron cadence) |

## REST (MCP app)

- `GET /api/v1/tasks` — list or query
- `POST /api/v1/tasks` — spawn
- `GET /api/v1/tasks/:taskId` — get
- `PATCH /api/v1/tasks/:taskId` — update

Auth: Bearer JWT. Project scope via tool args (`orgSlug`, `projectSlug`) or OAuth context.
