# work.implement_feature

## Purpose

Implement a single scoped feature or fix linked to a task.

## When to run

- Task `status=ready`, spawned by orchestrator or Human
- Agent picks from `query_tasks(status=ready, workflowKey=work.implement_feature)`

## Preconditions

- Task has clear `title` and `acceptanceCriteria`
- Repo/automation context available in agent environment (not SSOTA responsibility)

## Steps

1. `get_task` — load full context.
2. `update_task` — `status=running`, set `context.lockOwner` if needed.
3. Execute implementation per acceptance criteria in agent environment.
4. `update_task` — `status=done` or `blocked`/`failed` with `result` (PR link, summary).

## MCP tools

- `get_task`, `update_task`, optionally `spawn_task` for subtasks

## Completion

- All `acceptanceCriteria` met → `status=done`
- External blocker → `status=blocked`
