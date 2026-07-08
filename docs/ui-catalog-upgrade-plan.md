# UI 카탈로그 업그레이드 플랜 (서브에이전트 SSOT)

> 상태: draft · 2026-07-08 · 근거: 카탈로그 감사 + [품질 rubric](ui-catalog-quality-rubric.md)
> 목적: 약한 컴포넌트 레벨업 + 신규 크로스도메인 컴포넌트를 **서브에이전트 병렬**로 구현하기 위한 항목별 스펙. 각 항목은 자기완결 브리프다.
> 완료 레퍼런스: **Form/Field** 레벨업(`apps/web/lib/page-runtime/components/forms.tsx`) — 다타입 Field on `@ssota/ui` primitive. 이걸 패턴 예시로 삼는다.

## 오케스트레이션 프로토콜 (충돌 없는 병렬)

**공유 파일 3개는 서브에이전트가 편집하지 않는다** — 오케스트레이터가 마지막에 조립한다:
- `apps/web/lib/page-runtime/registry.ts` (import + spread)
- `packages/contracts/src/page/page-component-catalog.ts` (descriptor)
- `apps/web/lib/lab/page-runtime-demos.ts` (lab demo)

**각 서브에이전트가 하는 일**:
1. 자기 소유 컴포넌트 파일 **하나만** 작성/편집(`apps/web/lib/page-runtime/components/<file>.tsx`). 다른 파일 손대지 않음.
2. 반환(structured text)으로 다음 3개를 제공: **(a) descriptor TS 엔트리**(catalog에 붙일), **(b) registry import+spread 라인**, **(c) demo TS 엔트리**(demos에 붙일).
3. `@ssota/ui` primitive(`@/components/ui/*`) 사용, raw `<input>`/hex/Tailwind 팔레트 금지([DS-01/02/03]). 카탈로그 fn은 coercion만, stateful `<XxxEl/>`에 위임([types.ts] 훅 금지 규칙).
4. action은 기존 kind 사용(`create_node`/`update_node`/`set_node_property`/`create_edge`/`delete_edge`/`delete_node`) — 새 kind 필요하면 반환에 명시(오케스트레이터가 `page-runtime-schema.ts`+`run-page-action.ts`에 추가).
5. rubric R1–R10 충족. empty/loading/error 상태 포함.

**오케스트레이터**: 컴포넌트 파일들 확인 → 반환 엔트리들을 3개 공유 파일에 순차 조립 → `pnpm --filter web typecheck` + `--filter @ssota/contracts typecheck` + parity test(`registry.test.ts`) + `/labs/page-runtime` 렌더 검증 → 커밋.

## 공통 인프라 (오케스트레이터가 먼저 생성)

- **status 토큰 모듈** `apps/web/lib/page-runtime/status-tokens.ts` — 상태색 단일 SSOT(R7). 현재 document-status-badge/test-results/schema-display가 제각기 amber/emerald/red/sky 하드코딩. `{ statusColor(value) → {surface,border,text} }` + 표준 매핑(pending/draft=muted, review/todo=amber, approved/validated/done=emerald, rejected/failed=red, active/doing=blue, info=sky). 신규 컴포넌트는 이걸 import.

---

## A. 레벨업 (기존 파일 편집, 파일당 서브에이전트 1)

### A1 · `data.tsx` — NodeList / NodeTable / NodeField / NodeDocument
- **현재**: NodeList raw `<ul>`, NodeTable raw `<table>`(정렬·필터·타입 없음), NodeField 읽기전용, NodeDocument = 리터럴 mock("Document preview (mock)").
- **목표**: 전부 `@ssota/ui` primitive로. NodeList → 링크·아이콘·status badge(status-tokens)·**empty-state(CTA)**·정렬 옵션. NodeTable → 정렬/검색 최소, 타입드 컬럼(text/badge/date), rowHref. NodeField → label/value 정돈 + copy. NodeDocument → 실제 노드 `content`(BlockNote→text) 렌더 또는 명시적 empty(“내용 없음”). 
- **primitive**: Table, Badge, Button, Input(검색), Skeleton, EmptyState 패턴.
- descriptor 갱신(4개), demo 갱신(`data-list`,`data-fields` 등).

### A2 · `tokens.tsx` — TokenList
- **현재**: raw input, kind color/select/text만(length/font는 text로 fallthrough).
- **목표**: `@ssota/ui`(Input/NativeSelect/Slider(length)/color swatch). kind별 적절 컨트롤 + 미리보기.

### A3 · `forms.tsx` — **relation picker** (Field `inputType:"relation"` 또는 별도 RelationField)
- **현재**: 폼에서 노드 참조로 엣지 만드는 UI 없음. `create_edge` 런타임은 이미 존재(`run-page-action.ts`).
- **목표**: `inputType:"relation"` Field — `optionsBinding`(query 바인딩)으로 후보 노드 로드 → **combobox(검색)**로 선택 → 선택 nodeId를 form 값으로 수집(제출 시 `create_node`+`create_edge` 또는 `create_edge` 액션에 `$input`으로). multiselect 지원.
- **primitive**: `@/components/ui/combobox`(Base UI compound) + command. `boundNodes(bindingData, props)`로 후보.
- ⚠️ combobox는 Base UI compound라 사용법 주의. forms.tsx는 이미 Form/Field 레벨업됨 — 그 위에 추가.

### A4 · `charts.tsx` — 집계 binding + 차트 상태
- **현재**: ChartLine/Bar/Area/Pie/Radar/Radial 6종, 서로 near-duplicate(동일 KPI-snapshot 계약), raw node list만(집계 없음).
- **목표**: binding에서 **집계**(group_by/count/sum/avg over a field) 지원 → 예 "카테고리별 지출 합". 축/범례/툴팁·light/dark·색은 **dataviz 규칙**(사내 dataviz 스킬 참조) 표준화. empty/loading 상태.
- 새 action kind 불필요(읽기). 집계는 컴포넌트 내 계산 or 바인딩 스펙 확장(반환에 명시).

---

## B. 신규 크로스도메인 컴포넌트 (새 파일, 컴포넌트당 서브에이전트 1)

각 새 파일 `apps/web/lib/page-runtime/components/<name>.tsx`. registry key 신규 → 반환에 import+spread + descriptor + demo.

### B1 · **ApprovalInbox** (`approval-inbox.tsx`) — 최우선
- 승인 큐: 대기 항목 리스트 + 각 행 **승인/반려 버튼**(현재 editable-badge+setAction로 손조립하던 패턴을 캡슐화). props: `binding`(query), `titleField`, `metaFields[]`, `statusField`, `approveAction`/`rejectAction`(→ update_node/set_node_property). status-tokens 사용. empty-state.
- 도메인: 휴가·지출·PR·계약 승인 어디나.

### B2 · **KanbanBoard** (`kanban-board.tsx`)
- status 컬럼별 카드, 드래그로 status 변경 → `set_node_property`(status). props: `binding`, `groupField`(status), `columns[]`(값·라벨·색), `titleField`, `moveAction`. `@ssota/ui`에 kibo kanban 있으면 재사용(`/labs/tasks-board` 참조).
- 도메인: dev task·leave·deal stage.

### B3 · **CalendarView** (`calendar-view.tsx`)
- 월/주 캘린더에 노드 배치(date 필드 기준). props: `binding`, `startField`/`endField`, `titleField`, `colorField`. 클릭 → url_selection. 
- 도메인: 근태·휴가·이벤트·스프린트.

### B4 · **StatTile / StatRow** (`stat-tile.tsx`)
- KPI 카드: 값 + label + delta(전기간 대비) + sparkline. props: `binding`(집계 or singleton), `valueField`/`aggregate`, `label`, `deltaField?`. StatRow = grid of StatTile. (A4 집계와 연결.)
- 도메인: 대시보드 상단 지표(순자산·velocity·MRR).

### B5 · **Timeline / ActivityFeed** (`timeline.tsx`)
- 시간순 이벤트/변경 피드. props: `binding`, `timeField`, `titleField`, `byField?`. status-tokens.
- 도메인: audit·진행 이력.

### B6 · **RecordView** (`record-view.tsx`)
- 단일 노드 리치 풀페이지: 헤더 + property 섹션 + 관련 엣지(traverse) + 액션. props: `binding`(subject/node), `sections[]`, `relations[]`(edge 표시). NodeDetailSheet(시트)와 달리 풀페이지.
- 도메인: 어느 도메인이나 "레코드 상세".

### B7 (후속·낮은 우선순위) TreeView(조직도/카테고리), MapView, FileList(+upload), CommentThread, Stepper/Wizard, FilterBar(saved views), CsvImport
- 문서에 남기되 1차 웨이브 이후.

---

## 실행 순서 (웨이브)

1. **공통 인프라**: status-tokens 모듈(오케스트레이터).
2. **웨이브 1 (병렬)**: A1 data, A2 tokens, A3 relation, A4 charts, B1 ApprovalInbox, B2 Kanban, B4 StatTile.
3. **웨이브 2 (병렬)**: B3 Calendar, B5 Timeline, B6 RecordView.
4. **웨이브 3**: B7 나머지.
5. 각 웨이브 후: 공유 파일 조립 → typecheck+parity+lab 검증 → 커밋.
