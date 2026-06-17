# Cursor Automations — SSOTA orchestrator dogfood

This runbook sets up external scheduling for `orchestrator.*` workflows against the `ssota-labs/ssota-dev` project. SSOTA does not run cron internally in v1.

## Prerequisites

- SSOTA MCP app running and OAuth configured
- Cursor Automations enabled on your account/team
- Project scoped to `ssota-labs` / `ssota-dev`

## MCP connection

1. Add ssota MCP server in Cursor (see `plugins/ssota-plugin/`).
2. Authenticate with smoke or your operator account.
3. Verify tools: `list_projects`, `query_tasks`, `spawn_task`, `update_task`, `list_workflows`, `get_workflow_instruction`.

## Recommended automations

Create four Cursor Automations (or combine watchdog with daily if cost-sensitive).

| Automation | Schedule | Prompt hint |
|------------|----------|-------------|
| `ssota-orchestrator-daily` | Daily 09:00 KST | Run `orchestrator.daily` for ssota-dev. Use MCP only. |
| `ssota-orchestrator-weekly` | Mon 09:00 KST | Run `orchestrator.weekly` |
| `ssota-orchestrator-monthly` | 1st 09:00 KST | Run `orchestrator.monthly` |
| `ssota-orchestrator-watchdog` | Every 6h or daily 14:00 | Run `orchestrator.watchdog` |

### Example prompt (daily)

```text
You are the SSOTA daily orchestrator for project ssota-labs/ssota-dev.

1. MCP get_workflow_instruction with workflowKey=agent.main (session router).
2. MCP get_workflow_instruction with workflowKey=orchestrator.daily.
3. Use ssota MCP: query_tasks, spawn_task, update_task.
4. Do not read workflow markdown from the local repo.
5. End with a short summary in the orchestrator task result.
```

No-repo mode is sufficient for orchestrator-only runs.

## Workflow instructions SSOT

Instructions live in `packages/contracts/workflows/instructions/*.md`, are registered in `packages/contracts/src/workflows/index.ts`, and are **served to agents via MCP** (`list_workflows`, `get_workflow`, `get_workflow_instruction`). Deployed MCP is the runtime SSOT — agents must not read local workflow files.

Session entry: `get_workflow_instruction` with `workflowKey=agent.main`.

## Idempotency

Use keys like:

- `daily:{YYYY-MM-DD}:orchestrator`
- `watchdog:{taskId}:{YYYY-MM-DD}`

Duplicate `spawn_task` with the same `idempotencyKey` returns the existing task.

## Verification

```bash
# After automation runs
pnpm exec supabase status  # local
# MCP query_tasks workflowKey=orchestrator.daily status=done
```

Console: `/ssota-labs/ssota-dev/tasks` should show spawned work items.

## References

- Notion: Workflow · Task 데이터 모델 v1
- Repo: `packages/contracts/src/workflows/`
- MCP tools: `plugins/ssota-plugin/skills/ssota-mcp/references/tools.md`
