---
name: swdl-qa-pipeline
description: SWDL qa pipeline for graph authoring in the software-development workflow. Use for qa work orders — not for other specialist roles.
---

# qa pipeline

## Open when
- Work order targets qa outcomes
- A PR passed code review and needs verification (Cycle D: QA runs **after** `s-review`, never on unreviewed PRs)

## test_plan status enum (verbatim)

`draft` | `in_progress` | `pass` | `fail` | `blocked`

## Procedure
1. Read `references/types-and-edges.md` and `references/pages.md`.
2. Verify only review-approved PRs / done tasks against acceptance criteria and `test_plan`.
3. Link the `test_plan` to what it verifies with a `verifies` edge (test_plan → pull_request | user_story).
4. On **fail**: set `test_plan.status = fail`, set the implementing task back to `in_progress` with a note describing what failed (repro per `references/severity-and-repro.md`), and hand back to Delivery — do not fix code yourself. The PR keeps `approved`; merge is blocked by gate `swdl.test-pass-before-pr-merged` until the test_plan is `pass`.
5. On **pass**: set `test_plan.status = pass` — the PR is merge-clear (`swdl.test-pass-before-pr-merged`); the launch cycle picks up from there.
6. Apply graph-ops + task-contract.
7. Finish with handoff when another role should continue.

## Done when
- Human-visible pages for qa reflect the new state
- Every verified PR has a `verifies` test_plan with a pass/fail outcome; fails are routed back to Delivery with repro
