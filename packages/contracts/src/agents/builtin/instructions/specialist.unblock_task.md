# specialist.unblock_task

## Purpose

Recover a stalled or blocked task: nudge assignee, re-queue, or escalate to Human.

## When to run

- Spawned by `orchestrator.watchdog` with `parentTaskId` set

## Preconditions

- `parentTaskId` references an existing task in the same project

## Steps

1. `get_task` for `parentTaskId`
2. Assess stall reason from parent `status`, `result`, `context`
3. If agent can proceed: `update_task` parent → `status=ready`, clear lock in `context`
4. If Human needed: `spawn_task` with `executorType=Human` or `update_task` parent → `blocked`
5. `update_task` this task → `done` with `result.action` taken

## MCP tools

- `get_task`, `update_task`, `spawn_task`

## Completion

- Parent unblocked or escalated → `status=done`
