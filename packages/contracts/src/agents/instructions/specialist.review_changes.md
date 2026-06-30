# specialist.review_changes

## Purpose

Review code or graph changes against acceptance criteria and produce a structured review.

## When to run

- Task assigned with `agentKey=specialist.review_changes`
- Main Agent delegates a review work order

## Steps

1. `get_task` — load context and acceptance criteria.
2. `update_task` — `status=running`.
3. Inspect changes (graph nodes, task results, or external PR context).
4. `update_task` — `status=done` with `result.review` (pass/fail, findings).

## Completion

- Review summary in `result` with actionable findings
