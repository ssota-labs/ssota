# Console 페이지 UI 카탈로그 로드맵 (v0)

> **목적:** 44개 Console 페이지마다 **목표 json-render spec 트리**를 한 줄(한 슬라이스)로 고정하고, 다른 세션·PR에서 이어서 구현할 수 있게 한다.  
> **패턴 이름(A~H)은 참고용이며 SSOT는 아니다.** SSOT는 `slug → spec` (및 bindings/actions).

---

## SSOT 위치

| 항목 | 경로 |
|------|------|
| 페이지 spec 트리 (44슬라이스) | `packages/contracts/seed-packs/software-development-workflow/pages-tree.json` |
| L2 UI 컴포넌트 카탈로그 (기계 가독) | `packages/contracts/src/page/page-component-catalog.ts` |
| React 구현 (런타임 registry) | `apps/web/lib/page-runtime/` |
| 시드 적용 | `packages/adapter-postgres` — `applyDevWorkflowPack` / `pnpm db:seed` |
| E2E (페이지별) | `e2e/tests/` — slug·플로우별 스펙 추가 |

**불변식 (AGENTS.md):** 도메인 전용 React 페이지·라우트를 추가하지 않는다. URL 선택은 `url_selection` binding + `SelectionProvider`. 그래프 쓰기는 `GraphWritePort` only.

---

## 결정 규칙 (페이지마다 동일)

| 질문 | 카탈로그 쪽 답 |
|------|----------------|
| 노드 1개 + 긴 prose? | `Section` → `DocumentEditor` |
| 노드 N개 + prose? | `Section` → `DocumentSheetList` |
| 구조화 jsonb가 primary? | `ErdDiagram` / `SchemaDisplay` / `FlowCanvas` / `WireframeCanvas` |
| flat 레코드? | `DataTable` |
| parent→child graph? | `ExpandableTable` + `attachChildren` |
| 스튜디오/선택 URL? | `ArtifactWorkbench` / `WireframeCanvas` + `url_selection` |
| 폴더(허브)만? | `PageHeader` only (`PageHeader`는 런타임 no-op; nav placeholder) |

**레이아웃 관례**

- 좌/우 분할: `Resizable` (기본 62/38 또는 50/50)
- 세로 스택: `Stack` + `Section`
- 탭: `Tabs` → 각 tab panel은 element id
- 허브: `PageHeader` 단독 (자식 nav는 workspace `properties.nav`)

**properties convention (Δ 페이지에서 추가 예정)**

| 페이지/노드 | property | 컴포넌트 |
|-------------|----------|----------|
| `data_spec` (evergreen / initiative) | `erd` | `ErdDiagram` |
| `architecture_spec` (system-model) | `diagram` (또는 `flow`) | `FlowCanvas` model 1 |
| `api_reference` | `endpoints` | `SchemaDisplay` |
| `design_toolchain` | `figmaUrl` | `FigmaEmbed` |
| `qa` test-plan 노드 | `testRun` | `TestResults` |

---

## 진행 상태 범례

| 기호 | 의미 |
|------|------|
| ✅ | `pages-tree.json`이 목표 spec과 일치 (또는 목표=현재) |
| 🔄 | 부분 구현 / 인프라만 |
| ⏳ | 목표 확정, spec 미반영 |
| — | 변경 없음 (현재=목표) |

---

## 허브 12 — 변경 없음

모두 `PageHeader` placeholder. `pages-tree.json` 수정 불필요.

| slug | 목표 spec | 상태 |
|------|-----------|------|
| `executive` | `PageHeader` | ✅ |
| `research` | `PageHeader` | ✅ |
| `manager` | `PageHeader` | ✅ |
| `development` | `PageHeader` | ✅ |
| `design` | `PageHeader` | ✅ |
| `tpl/initiative/planning` | `PageHeader` | ✅ |
| `tpl/initiative/design` | `PageHeader` | ✅ |
| `tpl/initiative/architecture` | `PageHeader` | ✅ |
| `tpl/initiative/build` | `PageHeader` | ✅ |
| `tpl/initiative/qa` | `PageHeader` | ✅ |
| `tpl/initiative/launch` | `PageHeader` | ✅ |
| `tpl/initiative/retrospective` | `PageHeader` | ✅ |

---

## L0 콘텐츠 14

| slug | 현재 spec (시드) | 목표 spec | Δ | 상태 |
|------|------------------|-----------|---|------|
| `executive/roadmap` | `Stack` → `Section×2` → `DocumentSheetList×2` (product + planning) | `Stack` → **위:** `Section` → `DocumentEditor` (singleton `product_roadmap`) / **아래:** `Section` → `DocumentSheetList` (query `roadmap`) | product는 1노드인데 SheetList 부적합 | ⏳ |
| `executive/goals` | `Stack` → OKR `ExpandableTable` + KPI `DataTable`/`ChartLine` | 동일 | — | ✅ |
| `research/market` | `Section` → `DocumentSheetList` | 동일 (+ `Toolbar`는 후순위) | — | ✅ |
| `research/user` | `Section` → `DocumentSheetList` | 동일 | — | ✅ |
| `research/hypotheses` | `Section` → `DocumentSheetList` | 동일 | — | ✅ |
| `manager/initiatives` | `Section` → `Form` + `NodeTable` (`rowHref` 드릴인) | 동일 | — | ✅ |
| `development/data-model` | `Section` → `DocumentEditor` | `Resizable` 62/38 → 좌 `ErdDiagram` (`property: erd`) / 우 `DocumentEditor` | `properties.erd` convention | ⏳ |
| `development/system-model` | `Section` → `DocumentEditor` | `Resizable` 62/38 → 좌 `FlowCanvas` (`property: diagram`, model 1) / 우 `DocumentEditor` | 시스템 다이어그램 jsonb convention | ⏳ |
| `development/api-reference` | `Section` → `DocumentEditor` | `Resizable` 62/38 → 좌 `SchemaDisplay` (`property: endpoints`) / 우 `DocumentEditor` (서술·가이드) | — | ⏳ |
| `development/integration` | `Section` → `DocumentEditor` | 동일 (연동은 prose 중심) | — | ✅ |
| `design/ia` | `Section` → `DocumentSheetList` | 동일 — L0는 다건 IA | — | ✅ |
| `design/ui-components` | `ArtifactWorkbench` + `url_selection` | 동일 | — | ✅ |
| `design/theme` | `Section` → `TokenList` | 동일 | — | ✅ |
| `design/toolchain` | `Section` → `DocumentEditor` | `Resizable` 50/50 → 좌 `FigmaEmbed` (`urlField: figmaUrl`) / 우 `DocumentEditor` | `design_toolchain.figmaUrl` | ⏳ |

### `executive/roadmap` 목표 spec 스케치

```
Stack
├── Section "Product roadmap"
│   └── DocumentEditor  binding: evergreen product_roadmap (singleton)
└── Section "Planning roadmaps"
    └── DocumentSheetList  binding: query roadmap (+ filters)
```

- composite 참고: `PAGE_COMPOSITE_PATTERNS.RoadmapSheetWorkspace` (`page-component-catalog.ts`)
- 인프라: `DocumentSheetProvider` — 페이지 전역 viewport 단일 sheet (planning list용) ✅

---

## L1 initiative 콘텐츠 18

`appliesToNodeType: "initiative"`. bindings는 대부분 `initiative_scope` / `subject` / `traverse`.

| slug | 현재 spec (시드) | 목표 spec | Δ | 상태 |
|------|------------------|-----------|---|------|
| `tpl/initiative/overview` | `Resizable` 50/50 → `NodeField×5` (read-only) | `Resizable` 50/50 → **좌:** `Section` → `Select`/`Input`/`Textarea` (subject 편집) / **우:** `Section` → `NodeField×3` (release) + `DocumentEditor` (release notes 요약) | read-only → 편집 가능 | ⏳ |
| `tpl/initiative/planning/prd` | `Section` → `DocumentEditor` | 동일 | — | ✅ |
| `tpl/initiative/planning/features` | `ExpandableTable` + `attachChildren` | 동일 | — | ✅ |
| `tpl/initiative/planning/stories` | `DataTable` | 동일 | — | ✅ |
| `tpl/initiative/design/ia` | `Section` → `DocumentEditor` (1:1 IA) | 동일 — L0 `design/ia`와 의도적 분리 | — | ✅ |
| `tpl/initiative/design/wireframes` | `Resizable` → `WireframeCanvas` + `DataTable` | 동일 | — | ✅ |
| `tpl/initiative/design/flows` | `Section` → `FlowCanvas` | 동일 | — | ✅ |
| `tpl/initiative/architecture/spec` | `Resizable` → `DocumentEditor` + `NodeField×3` (read-only) | `Resizable` → 좌 `DocumentEditor` / 우 `Select×3` (status, version, owner **편집**) | `NodeField` → `Select`+action | ⏳ |
| `tpl/initiative/architecture/data` | `Section` → `DocumentEditor` | L0 `development/data-model`과 동일: `Resizable` → `ErdDiagram` + `DocumentEditor` | — | ⏳ |
| `tpl/initiative/architecture/integration` | `Section` → `DocumentEditor` | 동일 | — | ✅ |
| `tpl/initiative/build/plan` | `Section` → `DocumentEditor` | 동일 | — | ✅ |
| `tpl/initiative/build/tasks` | `Tabs` → `DataTable` + `Gantt` | 동일 | — | ✅ |
| `tpl/initiative/build/pull-requests` | `DataTable` | 동일 | — | ✅ |
| `tpl/initiative/qa/test-plan` | `Section` → `DocumentEditor` | `Tabs` → Tab1 `DocumentEditor` / Tab2 `TestResults` (`property: testRun`) | CI 연동 전 Tab2 empty OK | ⏳ |
| `tpl/initiative/launch/plan` | `Section` → `DocumentEditor` | 동일 | — | ✅ |
| `tpl/initiative/launch/docs` | `Tabs` → `Section` → `DocumentSheetList×2` | 동일 | — | ✅ |
| `tpl/initiative/retrospective/metrics` | `Tabs` → `DataTable×2` (KPI / Snapshots flat) | `Tabs` → KPI `DataTable` / Snapshots `ExpandableTable` (KPI←snapshot `attachChildren`) | 스냅샷을 KPI 하위로 | ⏳ |
| `tpl/initiative/retrospective/review` | `Section` → `DocumentEditor` | 동일 | — | ✅ |

---

## Δ 논의 큐 (구현 전 결정)

| # | slug | 핵심 쟁점 | 제안 (v0) |
|---|------|-----------|-----------|
| 1 | `executive/roadmap` | product = `DocumentEditor` vs `DocumentSheetList` 유지 | **Editor** — evergreen singleton 1노드 |
| 2 | `development/data-model` | `ErdDiagram` + `properties.erd` | evergreen `data_spec`에 `erd` jsonb 시드 |
| 3 | `development/system-model` | `FlowCanvas` vs prose-only | **FlowCanvas** model 1 — `architecture_spec.diagram` |
| 4 | `development/api-reference` | `SchemaDisplay` vs BlockNote only | **Split** — endpoints jsonb + prose 가이드 |
| 5 | `design/toolchain` | `FigmaEmbed` 넣을지 | **50/50** — URL 있으면 embed, 없으면 empty state |
| 6 | `tpl/.../overview` | read-only `NodeField` vs 편집 폼 | **편집** — subject + release 메타 |
| 7 | `tpl/.../architecture/spec` | metadata sidebar 편집 | `NodeField` → `Select` + `set_node_property` |
| 8 | `tpl/.../architecture/data` | L0 data-model과 동일 레이아웃? | **예** — initiative-scoped `data_spec` |
| 9 | `tpl/.../qa/test-plan` | `TestResults` 탭 추가 시점 | spec은 지금; Tab2 empty/skeleton until CI |
| 10 | `tpl/.../retrospective/metrics` | flat 2탭 vs KPI hierarchy | **ExpandableTable** + graph `attachChildren` |

---

## PR 단위 구현 절차 (세션 재개용)

한 PR = **pages-tree.json 슬라이스 하나** (+ 필요 시 시드·E2E). AGENTS.md 기능별 PR 분리 정책 준수.

1. **이 문서**에서 slug 한 줄 선택 → Δ 없으면 스킵.
2. `pages-tree.json`에서 해당 `key`의 `spec` / `bindings` / `actions` 수정.
3. **시드** — evergreen/initiative 노드에 새 property(`erd`, `endpoints`, `figmaUrl`, …) 필요 시 `packages/adapter-postgres` graph seed 갱신.
4. **검증**
   - `pnpm test --filter @ssota/contracts`
   - `pnpm --filter web typecheck`
   - 해당 플로우 E2E (`pnpm e2e --grep '<slug 키워드>'`)
5. **프론트 완료 정의** — agent-browser 스크린샷 2~4장 (Cloud: E2E 후 제한적 허용).
6. 커밋 접두사 `[contracts]` 또는 `[web]` — spec vs 런타임-only 구분.

### 권장 구현 순서 (Δ 10건)

1. `executive/roadmap` — product `DocumentEditor` (인프라·E2E 이미 있음)
2. `development/data-model` — `ErdDiagram` + 시드 `erd`
3. `development/api-reference` — `SchemaDisplay`
4. `development/system-model` — `FlowCanvas`
5. `design/toolchain` — `FigmaEmbed`
6. `tpl/initiative/architecture/data` — L0와 동일 패턴 복제
7. `tpl/initiative/architecture/spec` — metadata `Select` 편집
8. `tpl/initiative/overview` — 편집 폼
9. `tpl/initiative/qa/test-plan` — `Tabs` + `TestResults`
10. `tpl/initiative/retrospective/metrics` — `ExpandableTable` + attachChildren

---

## 완료된 인프라 (페이지 spec 외)

다음은 **여러 페이지 spec**에 공통으로 쓰이므로 별도 PR로 이미 반영되었거나 반영 중이다.

| 항목 | 설명 |
|------|------|
| `DocumentSheetProvider` | `DynamicPageRenderer` — viewport 단일 sheet (`dock="viewport"`) |
| `executive/goals` KPI | `ChartLine` + `DataTable` + period filter |
| `PageHeader` no-op | 페이지 타이틀 바 제거; sibling nav가 제목 역할 |
| Layout padding | `ConsolePageFrame` — sibling nav 시 `pt-2` |

---

## 한 줄 spec 요약 (44페이지 — 복사용)

```
executive                          PageHeader
executive/roadmap                  Stack → Section→DocumentEditor(product_roadmap) + Section→DocumentSheetList(roadmap)  [Δ]
executive/goals                    Stack → ExpandableTable(OKR) + Section→DataTable/ChartLine(KPI)
research                           PageHeader
research/market                    Section → DocumentSheetList
research/user                      Section → DocumentSheetList
research/hypotheses                Section → DocumentSheetList
manager                            PageHeader
manager/initiatives                Section → Form + NodeTable
development                        PageHeader
development/data-model             Resizable → ErdDiagram + DocumentEditor  [Δ]
development/system-model           Resizable → FlowCanvas + DocumentEditor  [Δ]
development/api-reference          Resizable → SchemaDisplay + DocumentEditor  [Δ]
development/integration            Section → DocumentEditor
design                             PageHeader
design/ia                          Section → DocumentSheetList
design/ui-components               ArtifactWorkbench
design/theme                       Section → TokenList
design/toolchain                   Resizable → FigmaEmbed + DocumentEditor  [Δ]
tpl/initiative/overview            Resizable → 편집폼(subject) + release메타/notes  [Δ]
tpl/initiative/planning            PageHeader
tpl/initiative/planning/prd        Section → DocumentEditor
tpl/initiative/planning/features   ExpandableTable
tpl/initiative/planning/stories    DataTable
tpl/initiative/design              PageHeader
tpl/initiative/design/ia           Section → DocumentEditor
tpl/initiative/design/wireframes   Resizable → WireframeCanvas + DataTable
tpl/initiative/design/flows        Section → FlowCanvas
tpl/initiative/architecture        PageHeader
tpl/initiative/architecture/spec   Resizable → DocumentEditor + Select×3(metadata)  [Δ]
tpl/initiative/architecture/data   Resizable → ErdDiagram + DocumentEditor  [Δ]
tpl/initiative/architecture/integration  Section → DocumentEditor
tpl/initiative/build               PageHeader
tpl/initiative/build/plan          Section → DocumentEditor
tpl/initiative/build/tasks         Tabs → DataTable + Gantt
tpl/initiative/build/pull-requests DataTable
tpl/initiative/qa                  PageHeader
tpl/initiative/qa/test-plan        Tabs → DocumentEditor + TestResults  [Δ]
tpl/initiative/launch              PageHeader
tpl/initiative/launch/plan         Section → DocumentEditor
tpl/initiative/launch/docs         Tabs → DocumentSheetList×2
tpl/initiative/retrospective       PageHeader
tpl/initiative/retrospective/metrics  Tabs → DataTable(KPI) + ExpandableTable(snapshots)  [Δ]
tpl/initiative/retrospective/review   Section → DocumentEditor
```

---

## 변경 이력

| 날짜 | 버전 | 내용 |
|------|------|------|
| 2026-07-03 | v0 | 초안 — 44페이지 slug→spec 제안안, Δ 논의 큐, 구현 절차 |
