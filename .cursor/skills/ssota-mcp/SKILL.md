---
name: ssota-mcp
description: Development-workflow MCP guardrails for ssota-dev dogfood only. Use only when querying project/task state through SSOTA MCP; do not mount for general coding tasks.
---

# SSOTA Development Workflow MCP Guardrails

This skill covers **how to connect to SSOTA MCP** only. Workflow instructions and routing rules live on the deployed MCP server — fetch them at runtime; do not read `packages/contracts/workflows` from the local repo.

Do not use this skill as a generic context graph runtime. The old graph/catalog/action/workflow runtime was **removed** from the repo (available in git history only) — do not restore or depend on it.

## When to use

Use this skill when the task needs SSOTA MCP for project/task/graph workflow context:

- authenticate and resolve `ssota-labs/ssota-dev`
- load **`agent.main`** routing instruction from MCP at session start
- list, query, spawn, or update development workflow tasks
- fetch per-workflow instructions on demand
- read or write graph nodes/edges via MCP

For normal repository coding work, follow `AGENTS.md` development workflow commands instead of MCP.

## Session bootstrap (required)

1. `list_projects` / `get_project` — confirm project scope
2. `get_workflow_instruction` with `workflowKey: "agent.main"` — routing SSOT (once per session)
3. Follow `agent.main` to `query_tasks`, then `get_workflow` + `get_workflow_instruction` per active task

Do **not** read workflow markdown from the local filesystem.

## Active MCP tool surface

Account: `list_organizations`, `list_projects`, `get_project`

Tasks: `list_tasks`, `query_tasks`, `get_task`, `spawn_task`, `update_task`

Workflows (instructions): `list_workflows`, `get_workflow`, `get_workflow_instruction`

Graph read: `list_node_types`, `get_node_type`, `list_edge_types`, `get_edge_type`, `search_catalog`, `query_nodes`, `get_node`, `traverse_edges`

Graph write: `create_node`, `update_node`, `create_edge`

Catalog authoring (Console v2.7): `create_node_type`, `create_edge_type`

Pages: `list_pages`, `read_page`, `list_page_components`, `get_page_component`, `create_page`, `update_page`

Agents & schedules: `list_agents`, `get_agent`, `get_agent_instruction`, `create_agent`, `list_schedules`, `create_schedule`

Always scope project tools to:

```txt
orgSlug: ssota-labs
projectSlug: ssota-dev
```

## Rules

- Fetch workflow instructions via MCP (`get_workflow_instruction`), not from local repo files.
- Do not call removed legacy tools — `execute_action`, `find_workflow`, `list_action_contracts`, gates/`submit_for_approval`, action log/`get_action_log_entry`. They were removed from the product. Graph writes go through `create_node`/`update_node`/`create_edge` (and page `actions`).
- Do not invent task IDs, node IDs, or project slugs. Discover first, then fetch.
- Do not commit access tokens, smoke credentials, OAuth secrets, or `.env` files.

## Response self-check

Before responding after MCP use:

- Did I load `agent.main` from MCP at session start?
- Did I scope to the correct organization and project?
- Did I fetch per-task workflow instructions from MCP before executing?
- Did I avoid removed legacy tools (`execute_action`, gates, action log) and use `create_node`/`update_node`/`create_edge` for graph writes?
