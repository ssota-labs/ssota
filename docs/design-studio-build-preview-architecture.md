# Design Studio — 빌드 Preview + Inspector 편집 아키텍처

> **상태:** Draft (설계 합의)  
> **작성:** 2026-06-16  
> **갱신:** 2026-06-17 — `properties` / `content` / Storage 3분할 명시  
> **관련:** Console v2.7 Design Studio, `ui_component`, `design_theme`

---

## 1. 요약

Design Studio preview는 **항상 빌드된 실제 React 컴포넌트**를 iframe에 렌더한다. 편집(Inspector, Layers 선택)도 **그 빌드 결과 DOM 위에서** 수행한다. draft/published를 서로 다른 렌더러(JSON `createElement` vs 빌드)로 나누지 않는다.

- **SSOT (편집·Deploy):** `ui_component` 노드 — **`properties`**(봉투·메타) + **`content`**(source 본문 JSON)
- **Preview:** 서버 esbuild 번들 → iframe 로드
- **Inspector:** iframe 내 DOM 즉시 패치 + `content` source 역동기화
- **Build artifact:** Supabase Storage (content-hash); 포인터는 `properties`
- **모든 preview 번들:** `@ssota/studio-preview-runtime` 기본 탑재

---

## 2. 배경 · 문제

### 현재 (v1)

| 항목 | 구현 |
|------|------|
| `ui_component.properties` | `slug`, `tier`, `draft` (전체 document JSON 문자열 — **역할 혼재**) |
| `ui_component.content` | Deploy된 `StudioNode` tree (`schemaVersion: 1`) |
| Preview | `render-studio-tree` — `createElement(tag)` + Tailwind className |
| Inspector | tree JSON의 `className` 직접 수정 |
| 한계 | shadcn/Base UI 실제 동작 없음, 복합 컴포넌트·npm deps 미지원 |

### 목표

v0에 가깝게 **실제 React + shadcn** preview를 제공하되, SSOTA 그래프(`nodes`)를 design SSOT로 유지한다. MCP·에이전트가 source 파일을 쓰고, 사람은 Inspector로 같은 artifact를 편집한다.

---

## 3. 핵심 원칙

1. **단일 preview 경로** — draft/published 모두 빌드 artifact를 iframe에 로드.
2. **편집은 iframe 위에서** — Inspector는 빌드된 DOM 대상; JSON DOM 렌더러는 wireframe 전용 또는 제거.
3. **번들 런타임 필수** — 모든 preview build에 studio bridge·inspect overlay·selection 포함.
4. **이중 패치** — (1) DOM 즉시 반영 (UX), (2) `content` source persist (SSOT).
5. **그래프 격리** — `project_id` 스코핑; catalog는 `packages/contracts` SSOT.
6. **properties / content 분리** — 카탈로그 Zod ≠ 전부 `properties`. 런타임이 쿼리·참조하는 **봉투**는 `properties`, **본문 페이로드**는 `content` (AGENTS.md 불변식).

---

## 4. 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│ Studio Shell (parent)                                            │
│  Layers │ iframe (built bundle) │ Inspector (className v0-style) │
└───────────────┬───────────────────────────────┬───────────────────┘
                │ postMessage                  │
                ▼                              ▼
┌───────────────────────────┐    ┌──────────────────────────────┐
│ @ssota/studio-preview-    │    │ Postgres nodes                │
│ runtime (in every bundle) │◄──►│  properties: slug, entry, deps│
│  STUDIO_READY / SELECT    │    │              buildHash, ...   │
│  STUDIO_PATCH → DOM       │    │  content: { files, layerIndex }│
└───────────────────────────┘    └──────────────────────────────┘
                ▲                          │
                │                          │ debounced patch → content.files
                │                          ▼
        ┌───────┴────────┐       ┌─────────────────────┐
        │ Build service   │──────►│ Supabase Storage     │
        │ esbuild + cache │       │ bundle.js/css/.map   │
        └────────────────┘       └─────────────────────┘
```

### 4.1 Preview 루프

1. Shell: `properties` + `content` + `design_theme` 로드
2. Build API: `hash(content + theme + properties.deps)` → 캐시 hit/miss
3. iframe: `STUDIO_LOAD_BUNDLE { url, buildId }`
4. User click → `STUDIO_SELECT { nodeId, sourceRef? }`
5. Inspector 변경 → `STUDIO_PATCH` → DOM 즉시 + `content.files` patch (debounce)
6. (선택) incremental rebuild → soft refresh
7. Deploy: `GraphWritePort` — `content` + 필요 시 `properties.buildHash` 갱신

### 4.2 `@ssota/studio-preview-runtime` (번들 공통)

| 모듈 | 역할 |
|------|------|
| `bridge` | `postMessage` — `packages/studio-renderer/protocol.ts` 확장 |
| `inspect-styles` | hover/selected outline |
| `selection` | click → `STUDIO_SELECT` |
| `patch-applier` | `STUDIO_PATCH` → DOM 즉시 반영 |
| `bootstrap` | `STUDIO_READY`, interaction mode |

### 4.3 DOM ↔ Source 매핑

| 방식 | 설명 |
|------|------|
| **A. Compile plugin (권장)** | JSX에 `data-studio-id` + `data-studio-loc` 주입 |
| **B. Source map 역참조** | generated offset → original TSX |
| **C. Layer index** | `content.layerIndex` (선택 캐시) |

### 4.4 Protocol 확장 (안)

```ts
// Parent → iframe
{ type: "STUDIO_LOAD_BUNDLE", url: string, buildId: string }
{ type: "STUDIO_PATCH", nodeId: string, patch: StudioPatch, sourceRef?: SourceRef }

// iframe → Parent
{ type: "STUDIO_SELECT", nodeId: string, sourceRef?: SourceRef }
{ type: "STUDIO_LAYER_TREE", nodes: LayerTreeNode[] }
```

---

## 5. 데이터 모델 — `properties` vs `content` vs Storage

### 5.0 SSOTA 노드 불변식 (복습)

| 레이어 | 카탈로그 | DB | 역할 |
|--------|----------|-----|------|
| **봉투** | `propertiesSchema` | `properties` JSONB | 쿼리·리스트·빌드 키·포인터 |
| **본문** | content 파서 (별도 Zod) | `content` TEXT | 문서/소스 **페이로드** (JSON 직렬화) |
| **바이너리** | — | Supabase Storage | esbuild 산출물 |

**카탈로그에 스키마가 있다고 전부 `properties`에 넣지 않는다.** `uiComponentContentSchema`처럼 content 형태도 contracts에서 정의하고, commit 시 parse한다.

### 5.1 `ui_component` — `properties` (v2, 카탈로그 `propertiesSchema`)

런타임·UI·빌드가 **참조·필터**하는 작은 필드만.

```ts
{
  slug: string;                    // 기존
  tier: "primitive" | "composite";   // 기존
  representation: "source";        // v2 기본; v1 tree는 "tree" (wireframe)
  contentSchemaVersion: 2;
  entry: string;                   // 예: "Component.tsx"
  dependencies: Record<string, string>;
  fileKeys: string[];              // 본문 파일명 목록 (본문 없음)
  buildHash?: string;              // 최신 published preview 빌드
  previewArtifactPath?: string;    // Storage 경로 (서명 URL 생성용)
  builtAt?: string;                // ISO-8601
}
```

- **`properties.draft` (v1):** v2에서 **제거**. draft는 `content` patch + `sessionStorage`만 (또는 unpublished `content` 그대로).
- Deploy 시 `properties`와 `content`를 함께 커밋; MCP `update_node`는 필드별 patch 가능.

### 5.2 `ui_component` — `content` (v2, `uiComponentContentSchema`)

**본문만.** `query_nodes` 목록 응답에 기본 포함하지 않거나 truncate (상세는 `get_node`).

```ts
{
  schemaVersion: 2,
  files: {
    "Component.tsx": "export function PrimaryButton() { ... }",
    "utils.ts": "export function cn(...) { ... }"
  },
  layerIndex?: Record<string, {
    file: string;
    name: string;
    kind: string;
  }>
}
```

- `entry`, `dependencies`는 **properties에도** 있음 (빌드·리스트용 denormalize). SSOT 우선순위: **properties가 메타 SSOT**, `content`는 파일 본문 SSOT. 불일치 시 build 전 validate.
- v1 `StudioNode` tree: `representation: "tree"` + `content.schemaVersion: 1`로 wireframe만 유지.

### 5.3 대용량 source (선택 확장)

`files`가 커지면:

| 데이터 | 위치 |
|--------|------|
| manifest (`fileKeys`, hash per file) | `properties` + `content` 일부 |
| TSX 본문 | Storage `{projectId}/studio-sources/{nodeId}/{file}` |
| 포인터 | `properties.sourceStoragePrefix` |

초기 v2는 **전체 `files` in `content`**로 시작; 임계치 넘으면 Storage 분리.

### 5.4 `design_theme` (안)

- **`content`:** theme token JSON (본문, `contentRequired: true` 유지)
- **`properties`:** (선택) `tokenVersion`, `buildHash` — theme rebuild 포인터

---

## 6. 저장소 전략 (3분할)

| 데이터 | 저장 위치 | 카탈로그 검증 |
|--------|-----------|----------------|
| slug, tier, entry, deps, build 포인터 | **`nodes.properties`** | `propertiesSchema` |
| source `files`, `layerIndex` | **`nodes.content`** | `uiComponentContentSchema` |
| 편집 중 낙관적 UI | **`sessionStorage`** | — |
| esbuild 산출물 (JS/CSS/map) | **Supabase Storage** | — (서버만 쓰기) |

**경로 예**

- Source (선택 분리): `{projectId}/studio-sources/{nodeId}/...`
- Build: `{projectId}/studio-builds/{buildHash}/bundle.js`

**흐름**

1. Inspector/MCP → `content.files` 갱신
2. Build → hash → Storage upload → `properties.buildHash`, `previewArtifactPath` 갱신
3. Preview iframe → Storage signed URL

**DB에 esbuild 번들 본문을 넣지 않는다.**

---

## 7. 좌측 Layers (Tree) 패널

**가능하다.** `content.layerIndex` 또는 source AST → `data-studio-id`와 동일 id 트리.

---

## 8. Build pipeline (서버)

1. **입력:** `content.files` + `properties.entry` + `properties.dependencies` + `design_theme`
2. **캐시 키:** `sha256(content + theme + deps + studioRuntimeVersion)`
3. **출력:** Storage + `properties.buildHash` 업데이트

---

## 9. Inspector 연동

Inspector 패치 → `content.files[sourceRef.file]` className 갱신 + `STUDIO_PATCH` DOM 반영.

---

## 10. MCP · 에이전트

- `create_node` / `update_node`:
  - `properties`: `slug`, `tier`, `entry`, `dependencies`, `fileKeys`
  - `content`: JSON.stringify(`{ schemaVersion: 2, files: { ... } }`)
- `get_node`로 전체 source 로드; `query_nodes`는 properties만 반환 권장

---

## 11. 마이그레이션 · 단계

| 단계 | 내용 |
|------|------|
| **P0** | contracts: `propertiesSchema` v2 + `uiComponentContentSchema` v2 |
| **P1** | `properties.draft` 제거; draft → `content` + sessionStorage |
| **P2** | esbuild + Storage + `STUDIO_LOAD_BUNDLE` |
| **P3** | Inspector → `content.files` patch |
| **P4** | v1 tree → `representation: "tree"` wireframe only |

---

## 12. 비범위 (v1)

- 브라우저 Web Worker 빌드
- props/event handler inspector
- npm 임의 registry

---

## 13. 결정 사항 체크리스트

- [x] Preview = 빌드된 React만
- [x] 모든 번들에 studio-preview-runtime 포함
- [x] **메타/포인터 = `properties`, source 본문 = `content`, 빌드 = Storage**
- [x] 카탈로그: `propertiesSchema` + `contentSchema` 이중 정의
- [x] `properties.draft` v2에서 제거
- [x] Layers = source/AST 기반
- [ ] contracts v2 PR
- [ ] Storage bucket + RLS
- [ ] esbuild POC

---

## 14. 참고 코드 (현재)

- Catalog: `packages/contracts/src/catalog/node-types.ts`
- Content v1: `packages/contracts/src/catalog/ui-component-schemas.ts`
- Draft (v1 hack): `properties.draft` — `apps/web/lib/design-studio/draft-storage.ts`
