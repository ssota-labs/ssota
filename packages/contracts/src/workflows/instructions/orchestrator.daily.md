# orchestrator.daily

## Purpose

Review project task backlog and spawn today's work items for agents or humans.

## When to run

- External automation cron (e.g. daily 09:00)
- Manual trigger with `workflowKey=orchestrator.daily`

## Preconditions

- Project context resolved
- No duplicate run for same calendar day (`idempotencyKey=daily:{YYYY-MM-DD}` on orchestrator summary task optional)

## Steps

1. `query_tasks` — `status` in `ready`, `running`, `blocked`; note stale `running` (>24h `updatedAt`).
2. `query_tasks` — `status=pending`, `executorType=Agent`, prioritize by `updatedAt`.
3. For each planned work item, `spawn_task` with:
   - `workflowKey` from `work.*` or initiative steward keys
   - `status=ready` for Agent work
   - `idempotencyKey=daily:{date}:{workflowKey}:{slug}`
4. If stale running tasks found, `spawn_task` `orchestrator.watchdog` or `work.unblock` child with watchdog idempotency.
5. `update_task` orchestrator run task with `result.summary` (counts spawned, skipped, stale).

## MCP tools

- `query_tasks`, `spawn_task`, `update_task`

## Spawn rules

- Prefer `work.implement_feature`, `work.write_document` for concrete execution
- Do not spawn duplicate work if `idempotencyKey` already exists

## Completion

- `status=done`
- `result.spawned`, `result.skipped`, `result.stale` tallies

## Escalation

- Ambiguous priority → spawn Human task with `executorType=Human`
