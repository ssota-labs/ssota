# Types & edges (planning)

Primary types: initiative, prd, feature, user_story

Launch/retro types planning also authors (Cycle E): launch_plan, release_note, runbook, retrospective

Common edges: `for_initiative` (domain includes `launch_plan`, `release_note`, `runbook`), `for_release` (launch_plan | release_note → release), plus role-specific SDLC edges (`specifies`, `spawns_story`, `tracked_by`, `blocked_by`, `implements` as applicable). `reflects_on` links a retrospective to its sprint/release/initiative.

Status notes: feature `approved` auto-spawns the Delivery DoR task (`swdl.feature-approved-onpass-dor`); PR `approved` auto-spawns the Planning launch-plan task (`swdl.pr-approved-onpass-launch`); release ships only after `launch_plan` is approved (`swdl.launch-approved-before-release` fires on release status → `shipped`).
