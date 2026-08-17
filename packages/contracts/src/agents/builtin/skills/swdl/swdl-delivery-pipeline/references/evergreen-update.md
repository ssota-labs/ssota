# Evergreen spec update (hygiene tasks, Cycle G)

Hygiene work orders update the evergreen specs so they reflect what the code/API actually does. **Initiative-less tasks are legitimate here** — the delivery-spawn gate passes when no initiative is in scope (`ifMissing: pass`); do not invent a fake initiative link.

## Surfaces

DocumentEditor pages over the evergreen nodes: `data_spec` (`development/data-model`), `architecture_spec` (`development/system-model`), `api_reference` (`development/api-reference`), `integration_spec` (`development/integration`). API drift evidence lives on `development/api-snapshots` (SchemaDisplay compare of latest `api_snapshot` vs `api_reference`).

## Procedure

1. Read the drift items listed in the work order (from the orchestrator's hygiene scan).
2. Update the affected spec documents to match actual code/API behavior — no aspirational content.
3. Keep the `api_snapshot` linkage current: new snapshots link `snapshotted_from` → `api_reference`.

## Quality bar

- Specs reflect the actual code/API as of this task, with drift items resolved one by one
- A fresh `api_snapshot` is recorded after the update so the compare surface goes clean
