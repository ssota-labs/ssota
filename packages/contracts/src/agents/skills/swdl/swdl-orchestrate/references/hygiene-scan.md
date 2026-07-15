# Hygiene scan (Cycle G)

## When
- Weekly cadence (see `schedule-policy.md`) or manual trigger

## Procedure
1. Compare the latest `api_snapshot` against the evergreen `api_reference` — the human surface is the SchemaDisplay compare on `development/api-snapshots`.
2. Drift = an endpoint/field added, removed, or changed between snapshot and reference, **or** a spec document older than the latest snapshot (stale `data_spec` / `architecture_spec` / `integration_spec` counts too).
3. Branch:
   - **No drift** → close the hygiene task with a no-drift note.
   - **Drift** → `spawn_task` → Delivery listing the drift items explicitly (endpoint/field + what changed). Initiative-less spawn is allowed — `swdl.prd-approved-before-delivery-spawn` passes when no initiative is linked (`ifMissing: pass`).

## Quality bar for closure
- Evergreen specs updated to match actual code/API (Delivery follows its `evergreen-update.md`)
- A fresh `api_snapshot` recorded (`snapshotted_from` → `api_reference`) so the compare surface reads clean
