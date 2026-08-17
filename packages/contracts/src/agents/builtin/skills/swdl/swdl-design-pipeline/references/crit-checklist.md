# Design crit checklist (g-crit quality bar)

Self-check before requesting the Human design review; the crit gate loops rework back to wireframes.

- **Flows complete** — every `user_flow` covers entry → success path → exit; no dead-end nodes; flows trace back to a `feature`
- **States covered** — each `page_wireframe` addresses empty, loading, and error states (note them in properties or annotations)
- **Token usage** — colors/spacing/radius reference `design_theme` semantic tokens, not hard-coded values
- **Component reuse** — composites declare `composed_of` edges to existing primitives; justify any new `ui_component` instead of duplicating one
- **A11y basics** — contrast on primary/foreground pairs, focus/keyboard path through the flow, labels on interactive elements
- **Traceability (actionable via edges)** — every artifact carries an `informs` edge to its `feature` (the design→feature feed), `for_initiative` to the initiative, and `references` edges from wireframes to the `ui_component`s they use (`for_page` where applicable) — build navigates spec → design through these edges, so missing ones are crit blockers
