# orchestrator.bootstrap

## Purpose

One-time setup: document external automation hooks (Cursor/Claude/Codex) and verify ssota MCP connectivity for the project.

## When to run

- Manual Human trigger, or first dogfood session
- After project automation configuration changes

## Preconditions

- MCP `list_projects` / `get_project` succeeds for the target project
- Bearer auth and `X-SSOTA-Teamspace-Id` (or OAuth project context) configured

## Steps

1. Call MCP `query_tasks` with `workflowKey=orchestrator.bootstrap` and `status` in `running|ready` — skip if an open bootstrap task already exists (use idempotency).
2. Record in task `result` the automation checklist:
   - daily → `orchestrator.daily`
   - weekly → `orchestrator.weekly`
   - monthly → `orchestrator.monthly`
   - watchdog → `orchestrator.watchdog`
3. Optionally `spawn_task` a single `orchestrator.daily` task with `idempotencyKey=bootstrap:daily:{date}` if backlog is empty.
4. `update_task` this task to `done` with summary in `result`.

## MCP tools

- `query_tasks`, `spawn_task`, `update_task`, `get_project`

## Spawn rules

- Do not spawn work tasks during bootstrap unless explicitly requested in `context`.

## Completion

- `status=done`
- `result` contains automation checklist and MCP smoke status

## Escalation

- If MCP auth fails → `status=blocked`, `assignee` Human operator
