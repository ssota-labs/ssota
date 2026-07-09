# SWDL Work Cycles (A–G)

> Code SSOT: `packages/contracts/seed-packs/software-development-workflow/work-cycles.json`  
> L1 type: `work_cycle` · Console: `/{orgSlug}/work-cycle`  
> Gates: `gate_policy` instances + core `evaluateGatePolicies` (path expressions)

WorkCycles are an **operating map** for the software-development domain. They are **not** the orchestrator execution SSOT — agents/schedules/`spawn_task` run work; GatePolicy enforces boundaries and can sync-spawn on approval.

## Groups

| Letter | `group` | Focus |
|---|---|---|
| A | `direction` | Goals / direction |
| B | `discovery` | Research / discovery |
| C | `planning` | Initiative planning (PRD) |
| D | `delivery` | Build / delivery |
| E | `launch` | Launch / operate |
| F | `design` | Design track |
| G | `hygiene` | Platform hygiene |

Each instance has `cycleKey`, `topology` (`trigger` / `stage` / `gate` / `end` + edges), optional `handoffToCycleKeys`, and `includedTeamspaceIds: []` (all teamspaces).

Gate topology nodes carry `gatePolicyKey` → `gate_policy.properties.policyKey`. The `/work-cycle` UI joins policy require summaries onto those nodes.

## Minimal GatePolicy set (Planning → Delivery)

Seed: `gate-policies.json`

1. `swdl.prd-approved-before-task` — `before_create_node` match `task`
2. `swdl.prd-approved-before-delivery-spawn` — `before_spawn_task` match Delivery `agentDefinitionId`
3. `swdl.prd-approved-onpass-spawn` — update PRD → approved → `onPass` Delivery spawn (idempotent)
4. (optional) feature/story approved gate

Path expressions use catalog keys only (e.g. `in:for_initiative[prd].status`). Core never hard-codes SWDL literals.

## Authoring

AX skill Step 0 / 0b: `.agents/skills/ssota-ax-author/references/work-cycle-authoring.md` and `gate-policy-authoring.md`.
