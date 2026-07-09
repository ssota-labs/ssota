# SWDL operating model (WorkCycle + GatePolicy)

## Separation of concerns

| Layer | Role |
|---|---|
| **WorkCycle** | Human/AX map of loops (topology). Org catalog instances. |
| **GatePolicy** | Fail-closed enforcement on create/update/spawn. Path-expression requires. |
| **Agents / schedules / tasks** | Execution. Orchestrator may spawn; gates may block or `onPass`-spawn. |
| **Pages** | Human approval surfaces — prefer `set_node_property` / `update_node`; spawn via policy `onPass`. |

## Evaluation

- Source: `queryNodes(catalogKey: gate_policy)` via `createGraphGatePolicySource`.
- Hooks wired in `createNode` / `updateNode` / `spawnTask` when `gatePolicies` is on deps (web `getGraphDeps`, MCP graph/task services).
- Codes: `GATE_PENDING`, `GATE_REJECTED`.
- After update: if require newly satisfied → `onPass.effects` (`spawn_task`) sync, idempotent by template key.

## Path expression

See contracts `parseGatePath` / `gate-policy-schemas`. Examples in [swdl-work-cycles.md](swdl-work-cycles.md).

## Non-goals

- Legacy Action Log / Human Gate transaction restore ([ARCH-03])
- Soft/log-only gates (v1)
- End-user `/app` exposure of `/work-cycle`
- Using WorkCycle as runtime SSOT
