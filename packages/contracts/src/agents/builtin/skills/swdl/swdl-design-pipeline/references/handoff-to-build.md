# Handoff to build (design → planning/delivery)

Cycle F ends by feeding specs and stories (`handoffToCycleKeys: initiative_planning, delivery`). Delivery needs:

- **Annotated wireframes** — crit-approved `page_wireframe` nodes with state notes (empty/loading/error) and interaction annotations
- **`informs` edges authored** — design authors the feed edges (page_wireframe / user_flow / information_architecture → `feature`) and cites the node ids in the handoff; downstream refinement discovers design through them
- **Component specs** — `ui_component` nodes reachable via `specifies` (spec → component) and `references` (wireframe → component) edges; composites resolved via `composed_of`; delivery consumes design through `references`/`specifies`
- **DoR contribution** — for Cycle C story refinement (`s-stories`, owned by delivery): list which stories are design-ready, flag open UX questions as blockers, and include wireframe/flow node ids so stories can cite them
- **Handoff summary** — follow `swdl-handoff`: `nodeIds` for all touched design nodes, `nextRole` = planning (spec absorption) or delivery (build-ready), `blockers` for unresolved crit feedback
