# GatePolicy authoring

GatePolicies are **org-scoped L1 catalog instances** (`catalogKey: gate_policy`). The core evaluator is **generic** — no domain literals in code. Fail-closed: every matching policy must pass (`GATE_PENDING` / `GATE_REJECTED`).

## Hooks (`when`)

| Hook | Fires in |
|---|---|
| `before_create_node` | `createNode` |
| `before_update_node` | `updateNode` (optional property transition match) |
| `before_create_edge` | (reserved / when wired) |
| `before_spawn_task` | `spawnTask` |

Use an array when one policy body should apply to multiple hooks, or seed **two instances** that share the same `require` (e.g. block both `create_node` of `task` and Delivery `spawn_task`).

## Match

```ts
{
  catalogKey?: string           // create/update/edge subject type
  agentDefinitionId?: string    // spawn — pack UUID, not a hard-coded name
  property?: {                  // update only: evaluate only on this transition
    path: string
    in?: string[]
    notIn?: string[]
  }
}
```

## Path expression (`require[].path`)

Grammar:

```
self.<propPath>
<hop>(/<hop>)* .<propPath>
hop = (out|in):<edgeCatalogKey>[<nodeCatalogKey>]
```

Examples:

- `self.status`
- `in:for_initiative[prd].status` (subject = initiative)
- `out:for_initiative[initiative]/in:for_initiative[prd].status`

Predicates: `in` / `notIn`, `ifMissing: "fail" | "pass"`, optional `count: { min?, max? }` when the path is hop-only (node count).

## onFail / onPass

- `onFail.code`: `GATE_PENDING` | `GATE_REJECTED` (+ optional message/suggest).
- `onPass.effects`: run **after a successful update** when require becomes satisfied. Primary effect:

```ts
{
  kind: "spawn_task"
  agentDefinitionId: string
  titleTemplate?: string
  idempotencyKeyTemplate: string   // e.g. gate:{{policyKey}}:{{nodeId}}:delivery
  executorType?: "Agent" | "Human"
  includeSubjectNode?: boolean
  targetNodePath?: string          // path from updated node to spawn target
}
```

Approval UIs should only **set properties** (e.g. `status=approved`). Spawn is the engine’s job via `onPass` (also works for MCP `update_node`). Optional page action kind `spawn_task` is an explicit Inbox chain — secondary to `onPass`.

## Authoring checklist

1. Name `policyKey` (stable, namespaced: `domain.boundary-name`).
2. Choose hook(s) + match so write **and** spawn bypasses are both covered when needed.
3. Write path expressions against **catalog keys** that exist (or will exist) in the org.
4. Prefer `ifMissing: "fail"` for hard gates.
5. Add `onPass` only on the update that represents human approval.
6. Seed via `create_node` / pack JSON; console `/work-cycle` joins policies onto gate topology nodes.

SWDL minimal set: `packages/contracts/seed-packs/software-development-workflow/gate-policies.json`.
