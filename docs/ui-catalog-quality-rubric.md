# json-render 컴포넌트 품질 rubric

> 상태: draft · 2026-07-08
> 목적: L2 UI 카탈로그 컴포넌트의 품질 기준을 벤치마크(DataTable / ErdDiagram / WireframeCanvas / FlowCanvas / Gantt)에서 뽑아, 나머지 컴포넌트를 이 기준으로 끌어올린다. 에이전트가 저작한 페이지가 자동으로 SaaS급에 근접하도록 하는 **재료(컴포넌트) 표준**.
> 근거: 카탈로그 감사(디스크립터 `packages/contracts/src/page/page-component-catalog.ts`, 레지스트리 `apps/web/lib/page-runtime/registry.ts`, 구현 `apps/web/lib/page-runtime/components/`, 디자인 `DESIGN.md`/`@ssota/ui`).

## 벤치마크의 "품질 signature" (왜 좋은가)

DataTable(408+907 LOC)·ErD(react-flow+ELK)·Wireframe·FlowCanvas·Gantt(905 LOC)의 공통점:

1. **stateful `<XxxEl/>`에 위임** — 카탈로그 fn은 props coercion만(훅 금지), 실제 로직은 클라이언트 컴포넌트.
2. **`@ssota/ui` primitive 위에 구축** — AdvancedDataTable·ReactFlow·Badge·Checkbox·DropdownMenu·Avatar 등. raw `<input>`/hex/Tailwind 팔레트 안 씀([DS-01/02/03]).
3. **타입드(typed), stringly 아님** — 컬럼/필드가 `text|select|number|checkbox|date|badge` 등 타입 보유.
4. **직접 조작 + typed action dispatch** — inline edit, `setAction`/`addAction`/`deleteAction`/`create_edge`를 `{nodeId,field,value}` 등으로.
5. **상태 완결성** — empty(안내+CTA)/loading(skeleton)/error/partial. "No rows" 한 줄로 끝내지 않음.
6. **탐색 어포던스** — faceted filter·search·sort·column visibility/pin/resize(list 계열).
7. **url_selection + view-state 지속** — `usePageViewState`, `useSelection`.
8. **레이아웃 지능** — ELK auto-layout, 반응형, density.
9. **접근성·키보드** — Base UI primitive의 focus/label/keyboard.
10. **자기완결 props + 합리적 default**.

## 품질 rubric (신규·개선 컴포넌트 체크리스트)

- [ ] R1 카탈로그 fn은 coercion만, stateful `<XxxEl/>`에 위임
- [ ] R2 `@/components/ui/*`(`@ssota/ui`) primitive 사용 — raw `<input>/<select>`, raw hex, raw Tailwind 팔레트 금지
- [ ] R3 값이 타입드(문자열 강제 금지) — number/boolean/date는 그 타입으로 저장
- [ ] R4 상호작용은 typed action으로(`set_node_property`/`create_edge`…), 서버 재검증 경유([GRAPH-02])
- [ ] R5 empty/loading/error 상태 제공(빈 상태엔 다음 행동 CTA)
- [ ] R6 list 계열은 filter/sort/search 최소 하나
- [ ] R7 상태색은 **공유 토큰 맵** 한 곳에서(현재 document/test/schema가 제각기 하드코딩 — 통합 대상)
- [ ] R8 접근성: label 연결, 키보드 조작, focus ring
- [ ] R9 descriptor에 정확한 props + `example`(progressive-disclosure `get_page_component`가 노출)
- [ ] R10 parity 통과(`registry.test.ts`), typecheck/lint 그린

## 레벨업 우선순위 (감사 기반)

| 순위 | 컴포넌트 | 현재 결손 | 목표 |
|---|---|---|---|
| **1** | **Form / Field** | Field가 text-only raw `<input>`, primitive 미사용, Form 0-prop | 다타입 Field(text/textarea/number/date/select/checkbox/switch/**relation**) on `@ssota/ui`, Form 레이아웃(columns)·required |
| **2** | **Relation picker** | 폼에서 엣지 생성 UI 부재(단 `create_edge` 런타임은 이미 있음) | combobox 기반 relation Field → 노드 검색·선택 → form 값/create_edge |
| 3 | NodeList / NodeTable | raw ul/table, 무기능 | 링크·정렬·empty-state, DataTable 계열로 흡수 검토 |
| 4 | NodeDocument | 리터럴 mock("Document preview (mock)") | 실제 문서 렌더 또는 제거 |
| 5 | TokenList / Input·Textarea·Select(node-editor) | raw input | primitive 스왑 |
| 6 | Chart 6종 | 집계 binding·상태 부족, 서로 near-duplicate | aggregation binding + KPI stat tile + dataviz 규칙 |
| 7 | (신규) Approval/Inbox, Kanban, Calendar, KPI Stat, Timeline, Record view | 부재 | 크로스도메인 공통 컴포넌트 |

## 한 컴포넌트 개선이 건드리는 곳 (end-to-end)

1. descriptor — `packages/contracts/src/page/page-component-catalog.ts`
2. React — `apps/web/lib/page-runtime/components/<family>.tsx` (→ `<XxxEl/>`)
3. registry — `apps/web/lib/page-runtime/registry.ts`
4. parity test — `apps/web/lib/page-runtime/registry.test.ts` (자동 검증, 편집 불필요)
5. (신규 mutation 필요 시) action — `page-runtime-schema.ts` + `run-page-action.ts`
