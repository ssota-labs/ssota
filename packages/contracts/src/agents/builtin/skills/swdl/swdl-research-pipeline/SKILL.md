---
name: swdl-research-pipeline
description: SWDL research pipeline for graph authoring in the software-development workflow. Use for research work orders — not for other specialist roles.
---

# research pipeline

## Open when
- Work order targets research outcomes
- A release shipped and metrics need monitoring (Cycle E `s-monitor` — research owns `metric_snapshot`/`kpi` reads post-launch)

## Procedure
1. Read `references/types-and-edges.md` and `references/pages.md`.
2. Discovery runs in three stages (Cycle B): 증거 수집 (`s-sources`: market/user research, raw sources, competitors) → 인사이트 종합 (`s-synthesis`: hypothesis drafts) → 가설 검증 (`s-validate`: interviews/experiments). Insufficient evidence loops the hypothesis back to `testing`/`draft` for more evidence; `rejected` (disproven) and `parked` (shelved) are terminal — hold hypotheses to `references/quality-bar.md`.
3. Post-launch monitoring: capture `metric_snapshot` against `kpi` (`snapshotted_from`), visible on `tpl/initiative/retrospective/metrics`; feed outcomes into the retro (authored by Planning) and Direction's KPI review.
4. Apply graph-ops + task-contract.
5. Finish with handoff when another role should continue.

## Done when
- Human-visible pages for research reflect the new state
- Validated hypotheses are marked as initiative candidates; monitoring results are snapshotted
