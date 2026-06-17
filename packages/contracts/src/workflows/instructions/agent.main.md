# agent.main

## Purpose

Entry-point routing for SSOTA development agents. Load this instruction once per session via MCP, then fetch per-workflow instructions on demand.

## When to run

- Start of every agent session that uses SSOTA MCP
- After MCP auth or project context changes

## Preconditions

- MCP authenticated (Bearer JWT)
- Project scope resolved (`orgSlug` + `projectSlug` on project-scoped tools)

## Session bootstrap

1. `list_projects` — confirm target project exists
2. `get_project` — resolve `orgSlug` / `projectSlug`
3. `get_workflow_instruction` with `workflowKey=agent.main` — this file (once per session)

Do **not** read workflow instructions from the local repo (`packages/contracts/workflows`). Deployed MCP is the SSOT.

## Task inbox

1. `query_tasks` — `status` in `ready`, `running`, `blocked` (prioritize `ready` + `executorType=Agent`)
2. If no actionable task and you are the orchestrator automation, check for cadence tasks (below)
3. For each task to execute:
   - `get_task` — full context
   - `get_workflow` — metadata for `task.workflowKey`
   - `get_workflow_instruction` — execution steps for `task.workflowKey`
   - Follow that workflow's steps, then `update_task`

## Cadence routing (orchestrator tasks)

When `task.workflowKey` matches an orchestrator key, fetch and run that workflow's instruction:

| workflowKey | When |
|-------------|------|
| `orchestrator.bootstrap` | First-time project automation setup |
| `orchestrator.daily` | Daily backlog review and work spawn |
| `orchestrator.weekly` | Weekly planning |
| `orchestrator.monthly` | Monthly retrospective |
| `orchestrator.watchdog` | Stale/blocked task recovery |

Use `idempotencyKey` on `spawn_task` to avoid duplicate orchestrator runs.

## Work task routing

| workflowKey | Action |
|-------------|--------|
| `work.implement_feature` | Implement code per acceptance criteria in agent environment |
| `work.write_document` | Create or update graph document nodes via MCP |
| `work.unblock` | Recover stalled parent task |

Always call `get_workflow_instruction` for the task's `workflowKey` before executing.

## Graph context

When a workflow needs product context:

- `query_nodes`, `get_node`, `traverse_edges` — read graph
- `create_node`, `update_node`, `create_edge` — write graph (core use-case path only)

Prefer `task.targetNodeId` when set — `get_node` before `update_node`.

## MCP tools (active)

Account: `list_organizations`, `list_projects`, `get_project`

Tasks: `list_tasks`, `query_tasks`, `get_task`, `spawn_task`, `update_task`

Workflows: `list_workflows`, `get_workflow`, `get_workflow_instruction`

Graph: `list_node_types`, `get_node_type`, `list_edge_types`, `query_nodes`, `get_node`, `traverse_edges`, `create_node`, `update_node`, `create_edge`

## Forbidden

- Archived tools: `execute_action`, `find_workflow`, gates, action log
- Reading workflow markdown from local filesystem instead of MCP
- Direct database or Drizzle access from the agent

## Completion

This instruction does not complete a task. After routing, follow the fetched per-workflow instruction and update the active task.
