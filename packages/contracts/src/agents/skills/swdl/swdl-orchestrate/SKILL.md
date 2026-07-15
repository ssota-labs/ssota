---
name: swdl-orchestrate
description: Triage open work orders and route to Research, Planning, Delivery, QA, or Design; keep schedule-driven sweeps honest. Use on every orchestrator run — do not perform specialist graph authoring yourself.
---

# Orchestrate

## Procedure
1. Read `references/routing-table.md` and `references/schedule-policy.md`.
2. Query open specialist tasks; skip duplicates — and skip signals the gates already auto-spawn (feature approved → DoR, PR approved → launch plan).
3. `spawn_task` to the matching specialist only.
4. On the weekly sweep, run the hygiene scan per `references/hygiene-scan.md`.
5. Escalate per `references/escalation.md` when blocked repeatedly.

## Done when
- Spawned or explicitly no-op with reason
