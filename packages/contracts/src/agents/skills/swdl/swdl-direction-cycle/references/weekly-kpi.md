# Weekly KPI review

## When
- Cron: every Monday 08:00 Asia/Seoul (before SWDL Orchestrator weekday sweep)
- Idempotency: `swdl:direction:weekly:{YYYY-Www}`

## Steps
1. Query `kpi` and related `key_result` / `objective` nodes.
2. Judge drift per KPI — there is **no on-track status field**. `kpi.status` is only `active` | `archived`. Drift = compare `current_value` vs `target` on the kpi node (respecting `direction`, e.g. higher-is-better), using the latest `metric_snapshot` (via `snapshotted_from`) as the current reading when fresher than `current_value`.
3. Post Slack digest: green / yellow / red KPIs with one-line context each.
4. Invite thread replies for root-cause or pivot discussion.
5. **Streak tracking convention**: write the drift streak into this weekly task's `result.summary` as `driftStreaks: {kpiNodeId: weeks}` and read the prior run's `result` to increment it. Do not invent extra kpi properties for this. If ≥2 KPIs have a streak ≥2 weeks, propose `roadmap_rebalance` in thread.
6. This is the `s-signals` stage: on-track KPIs close the loop; sustained drift routes into `s-strategy` (OKR/roadmap draft) which then needs the `g-okr` approval gate.
7. Include post-launch signals: recent `metric_snapshot` nodes from launch monitoring (Cycle E `s-monitor`) count as direction input.

## Done when
- Weekly digest posted
- Follow-up captured in thread or `result.summary` (including `driftStreaks`)
