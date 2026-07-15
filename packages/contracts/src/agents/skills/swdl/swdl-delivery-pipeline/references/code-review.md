# Code review (Cycle D `s-review`)

Review sits between build and QA: 구현(task/PR) → 코드 리뷰 → QA → merge. Never hand a PR to QA before review approval.

## PR statuses (verbatim)

`open` | `in_review` | `changes_requested` | `approved` | `merged` | `closed`

`in_review` → `approved` or `changes_requested`. **`approved` = QA entry** — QA verifies approved PRs (`swdl.pr-approved-before-test-plan`); the actual `merged` transition requires a passing test_plan (`swdl.test-pass-before-pr-merged`).

## Expectations for a review-ready PR
- `pull_request` node linked to its work: `implements` → user_story/feature, `tracked_by` from the task
- Scope matches the story's acceptance criteria; summary states what changed and why
- Tests/verification evidence noted in properties (QA verifies, but review checks it exists)

## Reviewer checklist
- **Correctness** — behavior matches the story's acceptance criteria, edge cases considered
- **Tests updated** — new behavior covered; existing tests still meaningful, not just green
- **Security/perf basics** — no injected inputs unvalidated, no obvious N+1 / unbounded loops, secrets out of code
- **Style** — follows repo conventions; naming and structure a future reader can follow

## Changes-requested loop
- Review is Human-owned; `changes_requested` loops the PR back to build (`s-review → s-build` reject loop)
- Keep the same `pull_request` node — update `status`, address feedback, re-request review (`in_review`)
- Repeated rejections on the same PR → surface as a blocker instead of silently re-looping

## After approval
- Review `approved` → QA verification (`s-qa`); a QA `fail` loops the task back to build (the PR keeps `approved`)
- `approved` also auto-spawns the Planning launch-plan task (`swdl.pr-approved-onpass-launch`)
- QA `pass` → PR is merge-clear; launch handoff picks up from there
