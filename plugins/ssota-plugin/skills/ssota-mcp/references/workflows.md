# Workflows

Workflow definitions are **deployed with the MCP server** (contracts SSOT). Agents must fetch instructions via MCP — not from local `packages/contracts/workflows`.

## Session entry

| Step | Tool | workflowKey |
|------|------|-------------|
| 1 | `get_workflow_instruction` | `agent.main` |

`agent.main` describes task inbox, cadence routing (`orchestrator.*`), work routing (`work.*`), and graph tool usage.

## Per-task execution

1. `get_task` or `query_tasks` — find active task
2. `get_workflow` — metadata for `task.workflowKey`
3. `get_workflow_instruction` — full steps for `task.workflowKey`
4. Execute steps; `update_task` when done

## Registry keys (discover via `list_workflows`)

| Key | Role |
|-----|------|
| `agent.main` | Agent session router |
| `orchestrator.bootstrap` | One-time automation setup |
| `orchestrator.daily` | Daily backlog + spawn |
| `orchestrator.weekly` | Weekly planning |
| `orchestrator.monthly` | Monthly retrospective |
| `orchestrator.watchdog` | Stale task recovery |
| `work.implement_feature` | Code implementation |
| `work.write_document` | Graph document write |
| `work.unblock` | Unblock stalled task |

New keys ship with MCP deployments; use `list_workflows` to see the current set.
