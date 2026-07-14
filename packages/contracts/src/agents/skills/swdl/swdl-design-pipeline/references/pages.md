# Pages (design)

- `design/ui-components` — ArtifactWorkbench over `ui_component` rows; URL selection via `url_selection` param `component`; themed by the evergreen `design_theme`
- `design/theme` — token editor over the evergreen `design_theme` node: 6개 그룹 섹션으로 전체 canonical token manifest를 다룬다 (일부 5개 토큰이 아니라 그룹별 전체 토큰)
- `design/ia` — global information architecture surface
- `design/toolchain` — design toolchain reference page
- `tpl/initiative/design` — initiative-scoped design hub (wireframes / flows / components stat tiles)
- `tpl/initiative/design/ia` — DocumentEditor over the initiative's `information_architecture` doc
- `tpl/initiative/design/flows` — FlowCanvas over the initiative's `user_flow` rows (no longer limited to one flow)
- `tpl/initiative/design/wireframes` — WireframeCanvas over `page_wireframe` rows; URL selection via `url_selection` param `wireframe`; crit inbox = ApprovalInbox on `in_crit` → `approved` | `rework`; RelationEditor writes the `references` edge (wireframe → `ui_component`)
