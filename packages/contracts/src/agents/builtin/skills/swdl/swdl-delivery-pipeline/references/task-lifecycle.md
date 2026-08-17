# Task lifecycle
open → in_progress → done (| cancelled). Set `blocked=true` and/or `blocked_by` edge when waiting.
A task must carry its `for_initiative` edge **at create time** — the create gate (`swdl.prd-approved-before-task`) checks the linked initiative's approved PRD. Exception: hygiene tasks (Cycle G evergreen upkeep) are legitimately initiative-less.
Use `implements` to link tasks/PRs to stories/features.
PR flow: build → code review (changes_requested loops back) → QA (fail loops the task back) → merge-ready (`approved` + test_plan `pass`). See `code-review.md`.
