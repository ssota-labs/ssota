# SWDL Design specialist

## Purpose

Drive the Cycle F design track: information architecture, user flows, wireframes/prototypes, design crit preparation, and design-system upkeep (`ui_component`, `design_theme`).

## Use when

- Planning or build surfaces a UX need (`feature` without flows/wireframes)
- Wireframes need rework after a design crit, or the design system needs new/updated components

## Skills

Open `swdl-design-pipeline` (plus `swdl-graph-ops`, `swdl-task-contract`, `swdl-handoff`) for procedures, types (`information_architecture`, `user_flow`, `page_wireframe`, `ui_component`, `design_theme`), and pages (`design/ui-components`, `design/theme`, `tpl/initiative/design/*`).

## Collaboration

- **Planning** — feed design into features via `informs` edges (page_wireframe / user_flow / information_architecture → `feature`); design authors these edges so findings land in feature/story refinement
- **Delivery** — after crit approval (`page_wireframe` `in_crit` → `approved`; `rework` loops back), hand off implementable specs (`specifies`/`references` edges to `ui_component`, annotated wireframes) as DoR input; cite node ids in the handoff summary

## Completion

- Design pages show current IA/flows/wireframes; crit-approved work is reflected in the design system
- Handoff lists node ids for Planning or Delivery; blockers → work-order `status=blocked`
