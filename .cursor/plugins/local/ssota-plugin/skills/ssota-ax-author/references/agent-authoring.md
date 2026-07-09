# Agent authoring (S3) — the environment's recurring workers

Agents are `agent_definitions` — the "employees" that operate the environment: read/write the catalog nodes, drive the pages, and run on a cadence. Author them AFTER the catalog (they reference its types) and ideally after the pages (they surface work there).

## `create_agent` (upsert by id)

| field | required | notes |
|---|---|---|
| `name` | ✅ | Human-readable title. |
| `description` | ✅ | Skill-style **"use when …"** routing line — the main agent routes by it. |
| `body` | ✅ | The playbook as **markdown** — a clear step-by-step process naming the catalog types/pages it works on. |
| `toolBundles` | – | Capabilities (see vocab). Empty = defaults only. |
| `allowedTriggers` | – | How it runs (see vocab). **No trigger ⇒ it never runs.** |
| `model` | – | Model id override. |
| `maxSteps` | – | Step budget. |
| `linkedWorkerAgentIds` | – | Agent ids this one dispatches to (orchestrator → specialists). |
| `id` | – | Omit to create; pass to update. |

Returns `{id, name, description, toolBundles, runPolicy}`. Bad enum values (unknown bundle/trigger) are rejected. (Every call also needs the project scope `orgSlug`+`teamspaceSlug`, per the `ssota-mcp` connection.)

**Reading agents back.** `list_agents` → `{agents:[…]}` and `get_agent {agentDefinitionId}` (the read param is `agentDefinitionId`, not `id`) both return `{id, name, description, toolBundles, allowedTriggers, linkedWorkerAgentIds}` — enough to verify the org-chart. `get_agent_instruction {agentDefinitionId}` returns the playbook text.

### `toolBundles` vocab
`graph.read`, `graph.write`, `tasks.manage`, `pages.author`, `connectors`, `delegate`, `workers`, `skills.read`, `sandbox.code`. (A few defaults — `graph.read`, `tasks.manage`, `connectors`, `workers` — are merged in at runtime; still set what the agent clearly needs.)

### `allowedTriggers` vocab
`task` (dispatched work item), `schedule` (cron cadence — needs a schedule, next slice), `heartbeat` (periodic tick), `chat`/`chatbot` (conversational), `manual`, `gate_resume`.

## Dispatch — how agents hand off work

An orchestrator (or any agent) creates work for another agent with **`spawn_task`**. The target must have the `task` trigger. `contextRefs` is an **object** (not an array):

```json
{ "title": "…", "agentDefinitionId": "<specialist id>",
  "executionDirective": {
    "goal": "…(≥10 chars)…", "background": "…(≥10 chars)…",
    "steps": ["…"], "constraints": [],
    "contextRefs": { "nodeIds": [], "edgeIds": [], "taskIds": [] } },
  "acceptanceCriteria": ["…"] }
```

This is how the org-chart actually runs — `linkedWorkerAgentIds` records the intended targets; `spawn_task` does the dispatch.

## Orchestrator vs specialist (a preferred pattern, not mandatory)

- **Specialist** — a focused worker: domain `toolBundles` (e.g. `graph.read`+`graph.write`), trigger `task` (+ maybe `schedule`), a tight playbook for one job.
- **Orchestrator** — the coordinator: `tasks.manage`+`delegate` (often `+workers`), triggers `schedule`/`heartbeat`, `linkedWorkerAgentIds` = its specialists, a playbook that scans state and `spawn_task`s work to them. Orchestrators can nest (an orchestrator whose workers are themselves orchestrators) — an org chart.
- Small domains may need only one or two specialists and no orchestrator. Add an orchestrator when the domain should run itself on a cadence.

## Worked example — HR agents (on the leave/attendance environment)

1. **Leave intake specialist** — `toolBundles:["graph.read","graph.write","tasks.manage"]`, `allowedTriggers:["task"]`. Body: read pending `leave_request` → check `leave_balance` → create `approval` + `approved_by`/`covered_by` edges → surface on the approval-queue page.
2. **Attendance-anomaly specialist** — `["graph.read","graph.write"]`, `["task","schedule"]`. Body: scan `attendance_record` for `anomaly != none`, flag the employee. (Include `task` so the orchestrator can dispatch to it **now**; `schedule` is its eventual cadence but isn't reachable until the schedules slice.)
3. **HR orchestrator** — `["tasks.manage","delegate","workers","graph.read"]`, `["schedule","heartbeat"]`, `linkedWorkerAgentIds:[intakeId, anomalyId]`. Body: *daily* — scan pending leave + attendance anomalies and `spawn_task` to the two specialists; *monthly* — trigger balance accrual.

After authoring, `list_agents` shows them and `spawn_task {agentDefinitionId: intakeId, …}` dispatches a real work item (no more `UNKNOWN_AGENT_DEFINITION`). The cadence that makes the orchestrator fire on its own is the **schedules** layer (next).

## Anti-patterns

- An agent with capabilities but **no trigger** — it can never run.
- Giving a dispatched-to specialist only `schedule`/`heartbeat` — it can't receive a `spawn_task` without the `task` trigger.
- A vague `description` — breaks routing.
- Authoring an orchestrator that references specialist ids that don't exist yet — create the specialists first, then the orchestrator with their ids.
- Trying to author/replace the platform **main** agent — out of scope; you build domain agents.
