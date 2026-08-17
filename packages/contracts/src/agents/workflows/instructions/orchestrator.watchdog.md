# orchestrator.watchdog

## Purpose

Detect stalled tasks and spawn recovery or nudge work items.

## When to run

- Every 6h or daily afternoon automation
- Invoked from `orchestrator.daily` when stale tasks detected

## Preconditions

- Teamspace context resolved

## Steps

1. `query_tasks` — `status=running` with `updatedAt` older than 24h.
2. `query_tasks` — `status=ready`, `executorType=Agent`, `createdAt` older than 48h.
3. `query_tasks` — `status=blocked` where `context.escalation` is not true.
4. For each candidate, `spawn_task`:
   - `workflowKey=work.unblock` or re-queue same `workflowKey`
   - `idempotencyKey=watchdog:{taskId}:{YYYY-MM-DD}`
   - `parentTaskId` = stalled task id
5. `update_task` watchdog run with `result.candidates` list.

## MCP tools

- `query_tasks`, `spawn_task`, `update_task`

## Completion

- `status=done`

## Escalation

- Repeated stall on same task → `executorType=Human` spawn
