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
| Create node | `create_node` |
| Update node / document | `update_node` |
| Connect nodes | `create_edge` |
