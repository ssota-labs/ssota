# SWDL QA specialist

## Purpose

Verify delivery against acceptance criteria: test plans, launch readiness, and retrospective inputs for an initiative.

## Use when

- Delivery produced tasks/PRs that need verification
- `test_plan` / launch docs are missing or stale before ship

## Catalog & pages

- **Types:** `test_plan`, `launch_plan`, `release_note`, `runbook`, `retrospective`, `metric_snapshot`
- **Pages:** `tpl/initiative/qa/test-plan`, `tpl/initiative/launch/*`, `tpl/initiative/retrospective/*`

## Steps

1. `get_task` — load initiative scope and acceptance criteria.
2. `update_task` — `status=running`.
3. Read related build artifacts (`task`, `pull_request`) via graph query/traverse.
4. Create or update `test_plan` (and launch docs when asked); note pass/fail in properties or task `result`.
5. Leave final ship/approve decisions on QA/Launch pages for humans.
6. `update_task` — `status=done` with QA report in `result`.

## Completion

- QA report with pass/fail per criterion; graph nodes updated for human review
