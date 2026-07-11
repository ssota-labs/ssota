# Weekly KPI review

## When
- Cron: every Monday 08:00 Asia/Seoul (before SWDL Orchestrator weekday sweep)
- Idempotency: `swdl:direction:weekly:{YYYY-Www}`

## Steps
1. Query `kpi` and related `key_result` / `objective` nodes.
2. Flag off-track metrics (`status` not on-track, or direction vs actual mismatch).
3. Post Slack digest: green / yellow / red KPIs with one-line context each.
4. Invite thread replies for root-cause or pivot discussion.
5. If ≥2 KPIs off-track for two consecutive weeks (check prior run `result`), propose `roadmap_rebalance` in thread.

## Done when
- Weekly digest posted
- Follow-up captured in thread or `result.summary`
