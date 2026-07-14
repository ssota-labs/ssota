# Status semantics

Work-order (`tasks` table): `ready` → `running` → `done` | `blocked`.

Graph `task` node: `open` | `in_progress` | `done` | `cancelled` — **unchanged**; there are no review/QA states on the task. Review states live on the `pull_request` node (`in_review` / `changes_requested` / `approved`), QA states on the `test_plan` node (`pass` / `fail` / `blocked`). A QA fail sends the task back to `in_progress`, not to a special status.
