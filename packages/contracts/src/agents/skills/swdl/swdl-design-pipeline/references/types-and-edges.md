# Types & edges (design)

Primary types: information_architecture, user_flow, page_wireframe, ui_component, design_theme

`page_wireframe` status enum (verbatim): `draft` | `in_crit` | `approved` | `rework`

Edges (from the seed edge catalog):

- `informs` — page_wireframe | user_flow | information_architecture → feature: **the design→feature feed edge**. Design authors these so crit-approved artifacts flow into feature/story refinement.
- `for_initiative` — page_wireframe | user_flow | information_architecture → initiative
- `for_page` — page_wireframe | user_flow | ui_component | information_architecture → page
- `references` — page_wireframe (valid domain member) | prd | architecture_spec | implementation_plan → ui_component: wireframe → component links are first-class edges; the wireframes page RelationEditor writes them
- `composed_of` — ui_component → ui_component (composite built from primitives; prefer reuse over new components)
- `specifies` — prd | architecture_spec | data_spec | integration_spec → ui_component | page (specs pin down component behavior for build)

`design_theme` is an evergreen singleton (semantic tokens); do not create a second one — update its `tokens` property.
