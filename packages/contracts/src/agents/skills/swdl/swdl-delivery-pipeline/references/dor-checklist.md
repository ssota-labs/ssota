# Definition of Ready (DoR checklist)

A `user_story` is sprint-ready only when all of these hold:

- **Acceptance criteria clear** — testable pass/fail statements, no "TBD"
- **Estimate set** — fill the `estimate` property (shown as the estimate column on `tpl/initiative/planning/stories`)
- **Dependencies identified** — cross-story dependencies expressed as `blocked_by` edges, not prose
- **Design refs linked** — where UX applies, the story can cite wireframes/flows (design artifacts reach the feature via `informs`; wireframe node ids noted on the story)
- **Parent feature approved** — the gate blocks `ready` otherwise (`swdl.feature-approved-before-story-ready` reads `in:spawns_story[feature]`)

## Estimation guidance

- Fibonacci points (1, 2, 3, 5, 8) in the `estimate` property
- 8 means "split me" — apply the INVEST sizing rules from planning's splitting-rules before pulling into a sprint
- Estimate the story as specced, not as hoped; unknowns → smaller spike story first
