# Handoff schema

Minimum summary fields:

- `nodeIds`: created/updated graph nodes
- `nextRole`: research | planning | delivery | qa | design | direction | none
- `blockers`: short strings if any

## Cycle handoff pairs (work-cycle `handoffToCycleKeys`)

How each handoff actually fires — gate auto-spawn, orchestrator routing, or human/passive:

| From | To | Fires via |
|------|----|-----------|
| direction (A) | discovery, initiative_planning | Orchestrator/human reads direction digests (OKR, KPI drift) and dispatches Research or Planning |
| discovery (B) | initiative_planning (C) | **Human** creates the `initiative` from a `validated` hypothesis; the handoff summary is a routing signal for the Orchestrator/human, not an auto-spawn |
| initiative_planning (C) | delivery (D) | **Gates**: `swdl.prd-approved-onpass-spawn` (PRD → `approved` auto-spawns Delivery setup) and `swdl.feature-approved-onpass-dor` (feature → `approved` auto-spawns Delivery story-DoR task) |
| initiative_planning (C) | design (F) | Planning spawns Design manually when a `feature` lacks flows/wireframes (demand-driven, no gate) |
| delivery (D) | launch (E) | **Gate**: `swdl.pr-approved-onpass-launch` (PR → `approved` auto-spawns Planning launch-plan task) |
| launch (E) | direction (A) | **Passive**: Direction's weekly review reads `retrospective` / `metric_snapshot` nodes — no spawn |
| design (F) | initiative_planning, delivery | `informs` edges (design artifact → feature) + handoff summary with node ids; specs absorbed into stories |
| hygiene (G) | delivery (D) | Orchestrator spawns Delivery directly — initiative-less spawn is allowed (`swdl.prd-approved-before-delivery-spawn` is `ifMissing: pass`) |
