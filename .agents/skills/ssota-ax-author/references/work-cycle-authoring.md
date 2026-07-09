# WorkCycle authoring

WorkCycles are **org-scoped L1 catalog instances** (`catalogKey: work_cycle`). They are an **operating map** for humans and AX authors — not the orchestrator execution SSOT.

## When to author

Before catalog/pages/agents for a domain, sketch the recurring loops (A–G style groups or domain-specific). Each cycle answers: what triggers work, which stages exist, where humans gate, and what handoffs feed the next cycle.

## Instance shape (`properties`)

| Field | Role |
|---|---|
| `cycleKey` | Stable id (e.g. `swdl.planning`) — idempotent seed key |
| `group` | `direction` \| `discovery` \| `planning` \| `delivery` \| `launch` \| `design` \| `hygiene` |
| `sortOrder` | Overview ordering |
| `includedTeamspaceIds` | `[]` = all teamspaces; otherwise filter |
| `topology` | `{ nodes, edges }` — see below |
| `orchestratorMode` | Optional hint (`none` / `light` / `full`) |
| `loopSummary` / `endCondition` / `handoffToCycleKeys` | Narrative + overview edges |

### Topology nodes

```ts
{
  id: string
  kind: "trigger" | "stage" | "gate" | "end"
  label: string
  catalogKeys?: string[]       // stages that touch these types
  gatePolicyKey?: string       // → gate_policy.properties.policyKey
  owner?: "human" | "orchestrator" | "research" | "planning" | "delivery" | "qa" | "design"
}
```

### Topology edges

`kind`: `sequence` | `reject_loop` | `feed` | `handoff`

## MCP / graph write

Create via `create_node` with `catalogKey: "work_cycle"` (after the type exists in org catalog). Prefer upserting by a `properties.seed` / `cycleKey` convention so re-runs are idempotent.

SWDL reference pack: `packages/contracts/seed-packs/software-development-workflow/work-cycles.json`.

## Console

Builder UI: `/{orgSlug}/work-cycle` — overview of cycles + drill-in topology. Gate nodes show `gatePolicyKey` and a require summary when a matching `gate_policy` instance exists.

## Rules

- Do **not** treat WorkCycle as the runtime that spawns tasks — that is GatePolicy `onPass` + agents/schedules.
- Gate nodes must reference a real `gatePolicyKey` you will author next (or already seeded).
- Keep topology readable: one primary sequence; use `reject_loop` for send-back; `handoff`/`feed` for cross-cycle links.
