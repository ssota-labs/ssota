---
name: swdl-direction-cycle
description: Run Cycle A direction cadences — quarterly planning, weekly KPI review, and roadmap rebalance proposals. Use on every Direction schedule or Slack thread about goals, KPIs, or roadmap priority — not for research/planning/delivery work.
---

# Direction cycle

## Open when
- Schedule trigger: `quarterly_planning` or `weekly_kpi_review`
- Chat trigger: Slack thread on an active direction review
- Manual: operator creates a `roadmap_rebalance` task or asks in chat to rebalance/refresh goals
- Launch feedback: Cycle E → A is passive — the weekly review reads closed `retrospective` / `metric_snapshot` nodes as input (nothing spawns Direction)

## Cycle A topology
- `s-signals` (KPI/신호 해석) and `s-strategy` (OKR/로드맵 초안) are separate stages: weekly KPI review is signal interpretation — on-track ends the loop, drift routes into strategy drafting.
- KPI drift is judged from `current_value` vs `target` (plus latest `metric_snapshot`) — `kpi.status` is only `active`/`archived`, never "on-track".
- Strategy drafts pass the `g-okr` Human gate (`swdl.objective-approved-before-kr-active`, traversing the KR's `contributes_to` edge): the objective goes `draft` → `approved` in the `executive/goals` 승인 tab, and key results cannot go `active` before that.

## Procedure
1. Read `references/catalog-surface.md` for allowed node types.
2. Pick the playbook from task `context.triggerKey` or schedule idempotency prefix:
   - `quarterly_planning` → `references/quarterly-planning.md`
   - `weekly_kpi_review` → `references/weekly-kpi.md`
   - `roadmap_rebalance` → `references/roadmap-rebalance.md`
3. Query graph for objectives, key results, KPIs, roadmaps.
4. Post Slack summary per `references/slack-playbook.md`.
5. On thread replies, capture decisions; propose graph updates; confirm material edits with Human.

## Done when
- Digest delivered (or explicit no-op)
- Thread questions answered when chat trigger is active
- Graph reflects agreed changes or Human follow-up task spawned
