# Cursor Automations — SSOTA orchestrator dogfood

This runbook sets up external scheduling for `orchestrator.*` workflows against the `ssota-labs/ssota-dev` project. SSOTA does not run cron internally in v1.

## Prerequisites

- SSOTA MCP app running and OAuth configured
- Cursor Automations enabled on your account/team
- Project scoped to `ssota-labs` / `ssota-dev`

## MCP connection

1. Add ssota MCP server in Cursor (see `plugins/ssota-plugin/`).
2. Authenticate with smoke or your operator account.
3. Verify tools: `list_projects`, `query_tasks`, `spawn_task`, `update_task`.

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

1. Load workflow instruction orchestrator.daily from packages/contracts/workflows.
2. Use ssota MCP: query_tasks, spawn_task, update_task.
3. Do not clone repos unless spawning work.* tasks that need code.
4. End with a short summary in the orchestrator task result.
```

No-repo mode is sufficient for orchestrator-only runs.

## Workflow instructions SSOT

Instructions live in `packages/contracts/workflows/instructions/*.md` and are registered in `packages/contracts/src/workflows/index.ts`.

Orchestrator workflows spawn `work.*` tasks; separate work automations (or manual agent runs) should pick up `status=ready` work tasks.

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
