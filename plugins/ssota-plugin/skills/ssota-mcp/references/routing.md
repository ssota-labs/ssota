# Routing

## Session start

| Step | Tool | Notes |
|------|------|-------|
| Resolve project | `list_projects` → `get_project` | `orgSlug` + `projectSlug` on all project tools |
| Load router | `get_workflow_instruction` | `workflowKey: "agent.main"` |

## Task inbox

| Request | Tool |
|---------|------|
| List tasks | `list_tasks` |
| Filter tasks | `query_tasks` |
| Fetch task | `get_task` |
| Create task | `spawn_task` |
| Update task | `update_task` |

## Workflow instructions

| Request | Tool |
|---------|------|
| List workflow keys | `list_workflows` |
| Workflow metadata | `get_workflow` |
| Execution steps | `get_workflow_instruction` |

Route using `task.workflowKey` from the active task. Never read local workflow markdown files.

## Graph

| Request | Tool |
|---------|------|
| Query nodes | `query_nodes` |
| Fetch node | `get_node` |
| Traverse edges | `traverse_edges` |
| Search catalog | `search_catalog` |
| Create node | `create_node` |
| Update node / document | `update_node` |
| Connect nodes | `create_edge` |
| Author node/edge type | `create_node_type` / `create_edge_type` |

## Pages, agents, schedules (Console v2.7 authoring)

| Request | Tool |
|---------|------|
| List / read pages | `list_pages` / `read_page` |
| List / get page components | `list_page_components` / `get_page_component` |
| Create / update page | `create_page` / `update_page` |
| List / get agents | `list_agents` / `get_agent` / `get_agent_instruction` |
| Create agent | `create_agent` |
| List / create schedule | `list_schedules` / `create_schedule` |

Graph writes go through `create_node` / `update_node` / `create_edge` (and page `actions`) — there is no `execute_action`.
