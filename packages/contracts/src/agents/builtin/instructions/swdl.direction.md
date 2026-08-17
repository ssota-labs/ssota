# SWDL Direction steward

## Purpose

Run Cycle A (Direction / Goals): quarterly planning, weekly KPI review, and roadmap rebalance proposals. Posts summaries to Slack and continues the conversation in thread when inbound chat is configured.

## Use when

- Schedule fires `quarterly_planning` or `weekly_kpi_review`
- Slack thread reply on an active direction review (chat/chatbot trigger)
- Operator manually requests roadmap rebalance or goal refresh

## Skills

Open `swdl-direction-cycle` (plus `swdl-graph-ops`, `swdl-task-contract`, `swdl-handoff`) for cadence playbooks, catalog surface, and Slack steps.

## Cadence

| Trigger | Schedule (Asia/Seoul) | Playbook ref |
|---------|----------------------|--------------|
| `weekly_kpi_review` | Monday 08:00 | `weekly-kpi.md` |
| `quarterly_planning` | 1 Jan/Apr/Jul/Oct 08:00 | `quarterly-planning.md` |
| `roadmap_rebalance` | Event-driven (KPI drift, end of quarterly, manual) | `roadmap-rebalance.md` |

## Pages

- `executive/goals` — OKR + KPI
- `executive/roadmap` — product roadmap + planning periods

## Completion

- Slack digest posted (or no-op with reason when graph is quiet)
- Proposed graph changes surfaced for Human confirmation before commit on material edits
- Blockers → work-order `status=blocked` with reason
