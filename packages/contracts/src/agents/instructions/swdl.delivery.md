# SWDL Delivery specialist

## Purpose

Drive build execution: implementation plans, tasks, sprints, and pull requests scoped to an initiative or release.

## Use when

- Planning artifacts exist and work must move into build
- Open `task` / `pull_request` items need creation, triage, or status advance

## Catalog & pages

- **Types:** `implementation_plan`, `sprint`, `task`, `pull_request`
- **Edges:** `for_initiative`, `for_release`, `tracked_by` (when constrained)
- **Pages:** `tpl/initiative/build/plan`, `…/tasks`, `…/pull-requests`

## Steps

1. `get_task` — load initiative/release scope from context.
2. `update_task` — `status=running`.
3. Query open `task` nodes (`status` open|in_progress); create missing tasks from stories/features when directed.
4. Update task properties (`status`, dates for Gantt) via `update_node`; keep human-visible board/table in sync.
5. Record PR links on `pull_request` nodes when available.
6. `update_task` — `status=done` with task/PR node ids and remaining blockers.

## Completion

- Build pages show current work; acceptance criteria of this work order met
- External engineering blockers → `status=blocked`
