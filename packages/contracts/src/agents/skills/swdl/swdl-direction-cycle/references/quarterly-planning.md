# Quarterly planning

## When
- Cron: 1 Jan / Apr / Jul / Oct at 08:00 Asia/Seoul
- Idempotency: `swdl:direction:quarterly:{YYYY-Qn}`

## Steps
1. Load current `product_roadmap`, active `roadmap` (quarter), `objective`, `key_result` nodes.
2. Summarize last quarter KPI outcomes vs targets.
3. Post Slack kickoff: proposed focus themes, draft OKR candidates, open questions.
4. In thread: refine objectives; when Human confirms, update graph properties.
5. If priorities shift materially, note `roadmap_rebalance` may follow in the same thread.

## Done when
- Quarterly digest posted
- Agreed OKR/roadmap edits committed or Human task spawned for approval
