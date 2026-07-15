# Edge rules (SWDL)

Use constrained edges from the seed catalog:

- `for_initiative` → range `initiative` — domain is broad: planning/build/QA artifacts plus `release_note`, `runbook`, `metric_snapshot`
- `for_release` → range `release` (launch_plan, release_note, tasks/PRs/sprints/test_plans)
- `paired_with` — initiative → release (the initiative bundle creates the `planned` release up front)
- `specifies` — prd/specs → feature/story (also → page/ui_component for design)
- `spawns_story` — feature → user_story. **Feature → story is `spawns_story` ONLY** — do not use `part_of` for it; the story-ready gate reads `in:spawns_story[feature]`
- `contributes_to` — key_result → objective (the KR→objective convention; the `g-okr` gate traverses it)
- `informs` — evidence/design artifacts → hypothesis/objective/initiative/prd/feature (includes page_wireframe / user_flow / information_architecture → feature)
- `references` — market_research/raw_source/prd/specs/page_wireframe → competitor/api_reference/api_snapshot/ui_component/raw_source
- `verifies` — test_plan → pull_request | user_story (QA linkage)
- `tracked_by` — task → pull_request
- `blocked_by` — task → task
- `implements` — task|pull_request → user_story|feature
- `part_of` — hierarchy edge (e.g. task → sprint, raw_source → market_research) — not for feature→story

Do not use `agent_owns_page` in Domain Pack work.
