---
name: swdl-direction-cycle
description: >-
  Run Cycle A direction cadences: quarterly planning, weekly KPI review, and
  roadmap rebalance proposals. Use on every Direction schedule or Slack thread
  about goals, KPIs, or roadmap priority — not for research/planning/delivery work.
---

# Direction cycle

## Open when
- Schedule trigger: `quarterly_planning` or `weekly_kpi_review`
- Chat trigger: Slack thread on an active direction review
- Manual: operator asks to rebalance roadmap or refresh goals

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
