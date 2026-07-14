# Splitting rules

Feature → user_story via `spawns_story`. Keep PRD linked with `for_initiative`.

Gate order (Cycle C): PRD draft → PRD 승인 → feature 분해 → Feature 승인 → stories. Stories cannot go `ready` before their parent feature is approved (the story-ready gate reads `in:spawns_story[feature]`).

## Sizing rules (INVEST-style)

**Feature** — one deliverable capability, one PRD requirement (§5) each, shippable within roughly a sprint or two of stories. Split when a feature needs more than ~5–8 stories or spans unrelated user goals.

**Story** — follow INVEST:
- **I**ndependent — deliverable without waiting on sibling stories (use `blocked_by` when unavoidable)
- **N**egotiable — states intent + acceptance criteria, not implementation
- **V**aluable — a user or operator can tell it landed
- **E**stimable — small enough for Delivery to put a point estimate on
- **S**mall — fits within a sprint; split by workflow step or acceptance criterion if not
- **T**estable — acceptance criteria phrased so QA can verify pass/fail

## DoR handoff (automatic)

When a `feature` reaches `approved`, the gate `swdl.feature-approved-onpass-dor` **auto-spawns a Delivery story-DoR task** — do not spawn Delivery yourself. Planning drafts story intent; Delivery makes them sprint-ready (estimation, dependency check). If UX is unresolved, route to the Design track (Cycle F) before stories firm up.
