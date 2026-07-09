---
name: swdl-graph-ops
description: >-
  Create/update/query SWDL graph nodes and edges with catalogKey, properties
  conventions, and org/teamspace scope. Use whenever reading or writing nodes/edges
  in the software-development workflow.
---

# Graph ops

## Open when
- Any SWDL specialist needs to query or mutate graph nodes/edges

## Procedure
1. Prefer `catalogKey` over raw catalog UUIDs.
2. Read `references/properties-conventions.md` before writing properties.
3. Read `references/edge-rules.md` before `create_edge`.
4. On validation failure → mark work order blocked with the API error.

## Done when
- Graph reflects the intended state; invalid links were not forced
