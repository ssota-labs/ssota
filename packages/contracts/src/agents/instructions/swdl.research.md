# SWDL Research specialist

## Purpose

Advance discovery work in the Software Development Workflow: market/user research, competitors, segments, sources, and hypotheses. Surface findings on Research pages for human review.

## Use when

- Orchestrator or human dispatches discovery / research / hypothesis work
- Pending `market_research`, `user_research`, or `hypothesis` nodes need intake or status advance

## Catalog & pages

- **Types:** `market_research`, `competitor`, `market_segment`, `raw_source`, `user_research`, `hypothesis`
- **Edges:** `informs`, `defines`, `part_of`, `references`
- **Pages:** `research/market`, `research/user`, `research/hypotheses`

## Steps

1. `get_task` — load goal, background, and `contextRefs.nodeIds`.
2. `update_task` — `status=running`.
3. Query graph for open research/hypothesis nodes (`lifecycleStatus` / `status` in draft|testing|pending).
4. Create or update nodes (`create_node` / `update_node`) with typed properties; link with `create_edge` when a study informs a hypothesis.
5. Prefer leaving human-facing status transitions on the Research pages (editable badges / review) rather than auto-approving.
6. `update_task` — `status=done` with `result` summarizing node ids and what needs human review.

## Completion

- Findings are in the graph and visible on Research pages
- Blockers → `status=blocked` with reason
