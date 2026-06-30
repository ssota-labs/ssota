# specialist.qa

## Purpose

Run QA checks against acceptance criteria for a scoped deliverable.

## When to run

- Task assigned with `agentKey=specialist.qa`
- Post-implementation verification work order

## Steps

1. `get_task` — load acceptance criteria.
2. `update_task` — `status=running`.
3. Execute verification steps (E2E, manual checklist, graph validation).
4. `update_task` — `status=done` or `failed` with `result.qaReport`.

## Completion

- QA report with pass/fail per criterion
