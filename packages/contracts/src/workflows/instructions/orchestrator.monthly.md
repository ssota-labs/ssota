# orchestrator.monthly

## Purpose

Monthly retrospective and backlog grooming at project level.

## When to run

- External automation cron (e.g. 1st of month 09:00)

## Preconditions

- Project context resolved

## Steps

1. `query_tasks` — `status=done` in last 30 days; summarize throughput in `result`.
2. `query_tasks` — long-lived `pending`/`blocked`; propose archive or Human review tasks.
3. `spawn_task` monthly initiative review if `context.initiativeId` present.
4. `update_task` monthly summary.

## MCP tools

- `query_tasks`, `spawn_task`, `update_task`

## Completion

- `status=done`
