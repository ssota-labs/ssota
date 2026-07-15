---
name: swdl-planning-pipeline
description: SWDL planning pipeline for graph authoring in the software-development workflow. Use for planning work orders — not for other specialist roles.
---

# planning pipeline

## Open when
- Work order targets planning outcomes
- A launch needs its `launch_plan` / release docs authored (Cycle E `s-plan` / `s-docs`)

## Procedure
1. Read `references/types-and-edges.md` and `references/pages.md`.
2. Author the PRD per `references/prd-template.md`, then follow the Cycle C gate order: PRD 초안 → PRD 승인 (`swdl.prd-approved-onpass-spawn`) → feature 분해 → Feature 승인 (`swdl.feature-approved-onpass-dor` auto-spawns the Delivery DoR task; `swdl.feature-approved-before-story-ready` blocks early story-ready) → story handoff.
3. Story refinement/estimation (DoR) is owned by Delivery — hand approved features/stories off rather than estimating yourself (see `references/splitting-rules.md`).
4. For launches (PR approval auto-spawns the launch-plan task via `swdl.pr-approved-onpass-launch`): author `launch_plan` before the Launch 승인 gate, and `release_note`/`runbook` after release cut.
5. Facilitate the retrospective: planning authors `tpl/initiative/retrospective/review` with metrics supplied by Research.
6. Apply graph-ops + task-contract.
7. Finish with handoff when another role should continue.

## Done when
- Human-visible pages for planning reflect the new state
- Artifacts sit at the right gate (draft vs approved); stories are handed to Delivery for DoR
