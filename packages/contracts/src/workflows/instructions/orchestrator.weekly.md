# orchestrator.weekly

## Purpose

Weekly planning pass: align tasks with initiatives, schedule larger work chunks, close stale items.

## When to run

- External automation cron (e.g. Monday 09:00)

## Preconditions

- Project context resolved

## Steps

1. `query_tasks` — all non-terminal statuses; group by `workflowKey`.
2. Review `blocked` and `failed` — spawn recovery or Human triage tasks.
3. `spawn_task` for weekly goals not yet represented in queue (`idempotencyKey=weekly:{YYYY-Www}:{key}`).
4. `update_task` with weekly summary in `result`.

## MCP tools

- `query_tasks`, `spawn_task`, `update_task`

## Completion

- `status=done`, `result` documents weekly plan
