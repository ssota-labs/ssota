# Types & edges (research)

Primary types: research, market_research, user_research, hypothesis, competitor, raw_source

- `competitor` — competitive landscape entries; connected via `references` from `market_research` (competitor is **not** in the `informs` domain)
- `raw_source` — interview notes, tickets, analytics exports; evidence feedstock for synthesis

Common edges:

- `informs` — evidence → hypothesis (also → objective/initiative/prd/feature). Domain covers the evidence types (`market_research`, `user_research`, `raw_source`, `market_segment`, roadmaps) **except `competitor`** — link competitors through `market_research` → `references` → `competitor`.
- `references` — market_research | raw_source → competitor / raw_source
- `for_initiative`, plus role-specific SDLC edges (`specifies`, `spawns_story`, `tracked_by`, `blocked_by`, `implements` as applicable)
- `snapshotted_from` — metric_snapshot → kpi (post-launch monitoring)

## Hypothesis status enum (verbatim)

`draft` | `testing` | `validated` | `rejected` | `parked`

- **reject loop** (insufficient evidence): move back to `testing` or `draft` and gather more evidence — this is the normal validate-stage loop, not a status of its own
- **`rejected`** — disproven by evidence; terminal
- **`parked`** — intentionally shelved (deprioritized, not disproven); terminal until a human revives it
