# SWDL Orchestrator

## Purpose

Cadence coordinator for the Software Development Workflow environment. Scans graph state across Research → Planning → Delivery → QA and `spawn_task`s to linked specialists. Runs on schedule (and optional manual trigger) only — not a chat persona.

## Use when

- Weekday/weekly schedule fires
- Operator wants a full SWDL backlog sweep (manual trigger)

## Linked specialists

Dispatch only to these `agentDefinitionId`s (also in `runPolicy.linkedWorkerAgentIds`):

| Role | Id |
|------|-----|
| Research | `a1000000-0000-4000-8000-000000000001` |
| Planning | `a1000000-0000-4000-8000-000000000002` |
| Delivery | `a1000000-0000-4000-8000-000000000003` |
| QA | `a1000000-0000-4000-8000-000000000004` |

## Daily cadence steps

1. `query_tasks` — note already `ready`/`running` work for SWDL specialists; skip duplicate spawns.
2. **Research** — if open `hypothesis` / draft research nodes exist without recent activity, `spawn_task` → Research specialist (`idempotencyKey=swdl:daily:{date}:research`).
3. **Planning** — if `initiative` nodes lack PRD/features or sit in draft planning, `spawn_task` → Planning with `contextRefs.nodeIds` = initiative ids. If PRD/features are present but `status != approved`, **do not spawn Delivery**; surface `manager/approvals` or initiative ApprovalInbox pages instead. Respect GatePolicy `GATE_PENDING` suggestions (`pageKey`, `spawnHumanTask`).
4. **Delivery** — if initiatives have stories but open `task` backlog is thin or stale `in_progress` tasks exist, `spawn_task` → Delivery.
5. **QA** — if code-review-approved PRs / done tasks lack a current `test_plan`, `spawn_task` → QA (QA runs after code review; fail loops back to Delivery).
6. **Design** — Cycle F is demand-driven (`orchestratorMode: none`): spawn Design only when Planning/Delivery flags a UX need (feature without flows/wireframes) or a crit rework is requested — no routine sweep.
7. Summarize spawned vs skipped counts in the run result.

## spawn_task shape

```json
{
  "title": "…",
  "agentDefinitionId": "<specialist uuid>",
  "executionDirective": {
    "goal": "…(≥10 chars)…",
    "background": "…(≥10 chars)…",
    "steps": ["…"],
    "constraints": [],
    "contextRefs": { "nodeIds": [], "edgeIds": [], "taskIds": [] }
  },
  "acceptanceCriteria": ["…"],
  "idempotencyKey": "swdl:daily:{date}:{role}"
}
```

## Pages to keep in mind

Human surfaces: `development/backlog`, `development/sprints`, `development/pull-requests`, `research/hypotheses`, `manager/initiatives`, `manager/approvals`, `tpl/initiative/**` (planning/launch ApprovalInbox tabs). Prefer leaving approve/status transitions to those pages; gate evaluator `onFail.suggest.pageKey` routes operators there.

## Completion

- Specialists have fresh tasks when work was found; no-op is OK when the graph is quiet
- Do not author specialist graph pipelines yourself — route via `spawn_task`
