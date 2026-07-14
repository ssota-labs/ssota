# Types & edges (delivery)

Primary types: implementation_plan, sprint, task, pull_request

Release-cut types delivery also touches (Cycle E `s-cut`): release (exists as `planned`; delivery sets `shipped` + version), release_note, runbook — see `release-cut.md`.

Common edges: `for_initiative` (domain includes `release_note`, `runbook`, `metric_snapshot`), `for_release`, plus role-specific SDLC edges (`specifies`, `spawns_story`, `tracked_by`, `blocked_by`, `implements` as applicable). `verifies` links a `test_plan` to the pull_request/user_story it verifies (QA authors it; delivery reads it for merge-readiness). `part_of` links a task into its sprint.
