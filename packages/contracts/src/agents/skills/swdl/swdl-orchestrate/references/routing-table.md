# Routing table

| Signal | Specialist | Human surface |
|--------|------------|---------------|
| Open hypotheses / research drafts | Research | `research/hypotheses` |
| Validated hypothesis without an initiative | Notify Human/Planning — **initiative creation is a human act**, do not auto-create | `research/hypotheses`, `manager/initiatives` |
| Initiative missing PRD/features/stories | Planning | `tpl/initiative/planning/*`, `manager/approvals` |
| Draft PRD/features/stories pending approval | Planning (Human) | `manager/approvals`, initiative ApprovalInbox tabs |
| GatePolicy `GATE_PENDING` on spawn/create | Escalate per `onFail.suggest` | `suggest.pageKey` or spawn Human task when `spawnHumanTask: true` |
| Feature → `approved` | **No spawn needed** — the DoR task auto-spawns via gate `swdl.feature-approved-onpass-dor`; only verify it exists | `tpl/initiative/planning/stories` |
| Approved features with unrefined stories (DoR), gate spawn missing/stale | Delivery | `tpl/initiative/planning/stories` |
| Stories without tasks / stale in_progress | Delivery | `development/backlog`, `tpl/initiative/build/tasks` |
| PRs awaiting code review / changes requested | Delivery (Human review) | `development/pull-requests` |
| PR → `approved` | **No spawn needed** — the launch-plan task auto-spawns via gate `swdl.pr-approved-onpass-launch`; only verify it exists | `tpl/initiative/launch/plan` |
| Review-approved PRs / done tasks without test_plan | QA | `tpl/initiative/qa/test-plan` |
| UX needed in planning/build (feature without flows/wireframes, crit rework) | Design | `tpl/initiative/design/*`, `design/ui-components` |
| Launch plan draft / release docs | Planning or Human | `tpl/initiative/launch/plan` Approval tab |
| Post-release metric monitoring | Research | `executive/goals` (KPI), retro pages |
| Weekly hygiene: api_snapshot vs spec drift | Delivery (initiative-less spawn allowed) — see `hygiene-scan.md` | `development/api-snapshots` (SchemaDisplay compare) |

## Gate policies to respect

| Policy key | Guards |
|------------|--------|
| `swdl.prd-approved-before-task` | initiative task create requires approved PRD (hygiene/initiative-less tasks exempt) |
| `swdl.prd-approved-before-delivery-spawn` | Delivery spawn with an initiative in scope requires approved PRD; `ifMissing: pass` — initiative-less (hygiene) spawns are allowed |
| `swdl.prd-approved-onpass-spawn` | PRD → approved auto-spawns Delivery (Cycle D setup) |
| `swdl.feature-approved-onpass-dor` | feature → approved auto-spawns Delivery story-DoR task |
| `swdl.pr-approved-onpass-launch` | PR → approved auto-spawns Planning launch-plan task |
| `swdl.feature-approved-before-story-ready` | story ready requires approved parent feature (reads `in:spawns_story[feature]`) |
| `swdl.objective-approved-before-kr-active` | key result active requires approved objective (Cycle A `g-okr`, traverses `contributes_to`) |
| `swdl.launch-approved-before-release` | release status → `shipped` requires approved launch_plan (Cycle E `g-launch`; the release node exists as `planned` from the initiative bundle) |

## Cycle handoff map (`handoffToCycleKeys`)

direction → discovery, initiative_planning · discovery → initiative_planning · initiative_planning → design, delivery · delivery → launch · launch → direction · design → initiative_planning, delivery · hygiene → delivery

## Gate-aware planning scan

Before spawning Planning work, check graph nodes (not only tasks):

1. `query` PRD/features with `status != approved` → point operator to `manager/approvals` or initiative planning pages.
2. `user_story` in `draft` with parent `feature.status = approved` → stories ApprovalInbox (`tpl/initiative/planning/stories`).
3. If Delivery spawn hits `swdl.prd-approved-before-delivery-spawn`, do **not** re-queue — resolve approval first.

Human `tasks` (`executorType=Human`) are for judgment work; graph `ApprovalInbox` handles artifact status transitions. Gate fail may suggest both.
