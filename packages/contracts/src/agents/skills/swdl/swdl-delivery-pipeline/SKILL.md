---
name: swdl-delivery-pipeline
description: SWDL delivery pipeline for graph authoring in the software-development workflow. Use for delivery work orders — not for other specialist roles.
---

# delivery pipeline

## Open when
- Work order targets delivery outcomes
- Approved features have stories needing refinement/estimation (Cycle C `s-stories` — delivery owns DoR; feature approval auto-spawns this task)
- A release needs cutting (Cycle E `s-cut`) or evergreen specs need a hygiene update (Cycle G)

## Procedure
1. Read `references/types-and-edges.md` and `references/pages.md`.
2. Story refinement (DoR): make approved stories sprint-ready per `references/dor-checklist.md` before pulling them into build.
3. Sprint/plan: slot ready stories into the sprint (implementation_plan / `part_of` task → sprint).
4. Build (구현): tasks + PRs per `references/task-lifecycle.md`.
5. Review: route every PR through code review per `references/code-review.md` (`in_review` → `approved` | `changes_requested`).
6. QA: hand review-approved PRs to QA (`verifies` test_plan, `pass`/`fail`; fail loops the task back to build).
7. Merge-ready = PR `approved` + test_plan `pass` → [Cycle E] release cut per `references/release-cut.md`.
8. Hygiene work orders: update evergreen specs per `references/evergreen-update.md`.
9. Apply graph-ops + task-contract; finish with handoff when another role should continue.

## Done when
- Human-visible pages for delivery reflect the new state
- Stories touched for DoR are sprint-ready; PRs are review-approved before QA handoff; cut releases are `shipped` with release notes
