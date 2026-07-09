---
name: swdl-orchestrate
description: >-
  Triage open work orders and route to Research, Planning, Delivery, or QA; keep
  schedule-driven sweeps honest. Use on every orchestrator run — do not perform
  specialist graph authoring yourself.
---

# Orchestrate

## Procedure
1. Read `references/routing-table.md` and `references/schedule-policy.md`.
2. Query open specialist tasks; skip duplicates.
3. `spawn_task` to the matching specialist only.
4. Escalate per `references/escalation.md` when blocked repeatedly.

## Done when
- Spawned or explicitly no-op with reason
