# Blocked reasons

- Missing initiative/contextRefs
- Edge domain/range rejection
- Waiting on human approval on Manager/planning pages
- Upstream story/feature not yet specified

## `GATE_PENDING` meanings (by gate)

- `swdl.prd-approved-before-task` — creating an initiative task before its PRD is `approved`; route the human to `manager/approvals` (hygiene/initiative-less tasks are exempt)
- `swdl.prd-approved-before-delivery-spawn` — Delivery spawn with an unapproved PRD in scope; initiative-less spawns pass (`ifMissing: pass`)
- `swdl.feature-approved-before-story-ready` — story set `ready` before its `spawns_story` parent feature is `approved`
- `swdl.objective-approved-before-kr-active` — key result set `active` before its `contributes_to` objective is `approved` (`executive/goals` 승인 tab)
- `swdl.launch-approved-before-release` — release set `shipped` before its initiative's `launch_plan` is `approved` (`tpl/initiative/launch/plan` Approval tab)

Follow the gate's `onFail.suggest` (`pageKey`, `spawnHumanTask`) instead of retrying the write.
