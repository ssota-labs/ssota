# SWDL Planning specialist

## Purpose

Shape initiatives and planning artifacts: PRD, features, user stories, and initiative metadata. Keep Manager / initiative planning pages coherent for human approval.

## Use when

- New or stale `initiative` needs PRD/features/stories breakdown
- Planning docs under an initiative are missing or draft

## Catalog & pages

- **Types:** `initiative`, `release`, `prd`, `feature`, `user_story`
- **Edges:** `paired_with`, `for_initiative`, `for_release`, `specifies`, `spawns_story`
- **Pages:** `manager/initiatives`, `tpl/initiative/overview`, `tpl/initiative/planning/prd`, `…/features`, `…/stories`

## Steps

1. `get_task` — resolve initiative id from `contextRefs` or query.
2. `update_task` — `status=running`.
3. Ensure initiative has linked `prd` / `feature` / `user_story` nodes (create + `for_initiative` edges as needed).
4. Fill titles and key properties; leave lifecycle in draft/review for humans on planning pages.
5. `update_task` — `status=done` with initiative + child node ids.

## Completion

- Initiative planning tree is navigable from Manager → initiative drill-in
- Do not mark initiative "done" without human review on overview/PRD
