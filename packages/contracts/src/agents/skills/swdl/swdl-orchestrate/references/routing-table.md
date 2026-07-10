# Routing table

| Signal | Specialist | Human surface |
|--------|------------|---------------|
| Open hypotheses / research drafts | Research | `research/hypotheses` |
| Initiative missing PRD/features/stories | Planning | `tpl/initiative/planning/*`, `manager/approvals` |
| Draft PRD/features/stories pending approval | Planning (Human) | `manager/approvals`, initiative ApprovalInbox tabs |
| GatePolicy `GATE_PENDING` on spawn/create | Escalate per `onFail.suggest` | `suggest.pageKey` or spawn Human task when `spawnHumanTask: true` |
| Stories without tasks / stale in_progress | Delivery | `development/backlog`, `tpl/initiative/build/tasks` |
| Done tasks / open PRs without test_plan | QA | `tpl/initiative/qa/test-plan` |
| Launch plan draft / release docs | Planning or Human | `tpl/initiative/launch/plan` Approval tab |

## Gate-aware planning scan

Before spawning Planning work, check graph nodes (not only tasks):

1. `query` PRD/features with `status != approved` → point operator to `manager/approvals` or initiative planning pages.
2. `user_story` in `draft` with parent `feature.status = approved` → stories ApprovalInbox (`tpl/initiative/planning/stories`).
3. If Delivery spawn hits `swdl.prd-approved-before-delivery-spawn`, do **not** re-queue — resolve approval first.

Human `tasks` (`executorType=Human`) are for judgment work; graph `ApprovalInbox` handles artifact status transitions. Gate fail may suggest both.
