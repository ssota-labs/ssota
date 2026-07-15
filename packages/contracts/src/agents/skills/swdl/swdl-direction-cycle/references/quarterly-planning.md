# Quarterly planning

## When
- Cron: 1 Jan / Apr / Jul / Oct at 08:00 Asia/Seoul
- Idempotency: `swdl:direction:quarterly:{YYYY-Qn}`

## Steps
1. Load current `product_roadmap`, active `roadmap` (quarter), `objective`, `key_result` nodes.
2. Summarize last quarter KPI outcomes vs targets, including launch retro / metric monitoring feedback (Cycle E → A handoff).
3. Post Slack kickoff: proposed focus themes, draft OKR candidates, open questions.
4. In thread: refine objectives; when Human confirms, update graph properties. Exact statuses: an `objective` moves `draft` → `approved` (the Human approves in the `executive/goals` 승인 tab, not in thread); a `key_result` may go `active` only after its objective is `approved` — the `g-okr` gate (`swdl.objective-approved-before-kr-active`) traverses the KR's `contributes_to` edge to the objective and rejects early activation.
5. If priorities shift materially, note `roadmap_rebalance` may follow in the same thread.

## Done when
- Quarterly digest posted
- Agreed OKR/roadmap edits committed or Human task spawned for approval
