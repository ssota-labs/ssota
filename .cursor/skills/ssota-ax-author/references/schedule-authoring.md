# Schedule authoring (S4) — the cadence that runs the environment

A schedule fires an **agent run** on a cron. This is what makes the environment "run itself": the orchestrator wakes on its cadence, scans state, and dispatches work. Author schedules LAST — the agents they fire must already exist.

## `create_schedule`

| field | required | notes |
|---|---|---|
| `agentDefinitionId` | ✅ | The agent to fire. Must already exist (else `Unknown agentDefinitionId`). |
| `cronExpression` | ✅ | Standard 5- or 6-field cron (else `Invalid cronExpression`). |
| `timezone` | – | IANA tz the cron is read in. Default `Asia/Seoul`. (The runtime heartbeat ticks in UTC but interprets each schedule's window in its zone.) |
| `enabled` | – | Default `true`. |
| `idempotencyPrefix` | – | Optional dedupe prefix for the fired runs. |

Returns the stored `{id, agentDefinitionId, cronExpression, timezone, enabled, …}`. `list_schedules` returns all of them.

The fired agent must have a cadence trigger (`schedule`/`heartbeat`) in its `allowedTriggers` (see agent-authoring) or the fire has nothing to run.

## Cron quick reference

`min hour day-of-month month day-of-week` (optional 6th leading field = seconds). Examples:

| cron | meaning |
|---|---|
| `0 9 * * *` | 09:00 every day |
| `0 * * * *` | top of every hour |
| `*/15 * * * *` | every 15 minutes |
| `0 9 * * 1` | 09:00 every Monday |
| `0 0 1 * *` | 00:00 on the 1st of each month |

## The orchestrator-cadence pattern

Schedule the **orchestrator**, not every specialist. The orchestrator's playbook, when fired, scans the graph and `spawn_task`s work to specialists (which run on the `task` trigger). Give a specialist its own schedule only for an independent periodic job (e.g. a nightly attendance-anomaly sweep).

Worked example (HR):
- `create_schedule { agentDefinitionId: <orchestrator>, cronExpression: "0 9 * * *" }` — daily 09:00: scan pending leave + attendance anomalies, dispatch to specialists.
- `create_schedule { agentDefinitionId: <orchestrator>, cronExpression: "0 0 1 * *" }` — monthly: trigger balance accrual.

After this, `list_schedules` shows the cadence and the environment is complete — the orchestrator will wake on its schedule and drive the specialists, whose output surfaces on the human-approval pages.

## Anti-patterns

- Scheduling an agent that doesn't exist yet (rejected) — author agents first.
- Scheduling an agent with no `schedule`/`heartbeat` trigger — the fire has nothing to run.
- Putting a cron on every specialist instead of letting the orchestrator dispatch — noisy and hard to reason about.
- A too-frequent cron (`* * * * *`) on a heavy agent — pick the coarsest cadence that meets the need.
