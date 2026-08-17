# Severity & repro

Capture repro steps in test_plan `coverage_notes` or task properties; link failing PRs with `tracked_by` from tasks.

## Fail handling (exact convention)

test_plan status enum: `draft` | `in_progress` | `pass` | `fail` | `blocked`.

On a failed verification:
1. Set `test_plan.status = fail` and record what failed + repro in `coverage_notes`.
2. Set the implementing `task` back to `in_progress` with a describing note — the reject loop goes through the **task**, not the PR.
3. Leave the `pull_request` at `approved` (review outcome stands); it must not merge until the test_plan reaches `pass` — enforced by gate `swdl.test-pass-before-pr-merged`.
4. Keep the `verifies` edge (test_plan → pull_request | user_story) so the failure is traceable.
