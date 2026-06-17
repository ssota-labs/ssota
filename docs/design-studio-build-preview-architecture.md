# Design Studio — 빌드 Preview + Inspector 편집 아키텍처

> **상태:** Draft (설계 합의)  
> **작성:** 2026-06-16  
> **관련:** Console v2.7 Design Studio, `ui_component`, `design_theme`

---

## 1. 요약

Design Studio preview는 **항상 빌드된 실제 React 컴포넌트**를 iframe에 렌더한다. 편집(Inspector, Layers 선택)도 **그 빌드 결과 DOM 위에서** 수행한다. draft/published를 서로 다른 렌더러(JSON `createElement` vs 빌드)로 나누지 않는다.

- **SSOT (편집·Deploy):** `ui_component` 노드의 `content` — 멀티파일 source bundle (TSX + entry + dependencies)
- **Preview:** 서버 esbuild 번들 → iframe 로드
- **Inspector:** iframe 내 DOM 즉시 패치 + source 역동기화
- **모든 preview 번들:** `@ssota/studio-preview-runtime` 기본 탑재 (postMessage, 선택, inspect CSS)

---

## 2. 배경 · 문제

### 현재 (v1)

| 항목 | 구현 |
|------|------|
| `ui_component.content` | `StudioNode` JSON tree (`schemaVersion: 1`) |
| Preview | `render-studio-tree` — `createElement(tag)` + Tailwind className |
| Inspector | tree JSON의 `className` 직접 수정 |
| 한계 | shadcn/Base UI 실제 동작 없음, 복합 컴포넌트·npm deps 미지원 |

### 목표

v0에 가깝게 **실제 React + shadcn** preview를 제공하되, SSOTA 그래프(`nodes`)를 design SSOT로 유지한다. MCP·에이전트가 source 파일을 쓰고, 사람은 Inspector로 같은 artifact를 편집한다.

---

## 3. 핵심 원칙

1. **단일 preview 경로** — draft/published 모두 빌드 artifact를 iframe에 로드 (모드는 source revision·캐시 키만 다를 수 있음).
2. **편집은 iframe 위에서** — Inspector 클릭·스타일 변경은 빌드된 DOM 대상; 별도 JSON DOM 렌더러는 wireframe 전용 또는 제거.
3. **번들 런타임 필수** — 모든 preview build에 studio bridge·inspect overlay·selection이 포함된다.
4. **이중 패치** — (1) DOM 즉시 반영 (UX), (2) source 파일 persist (SSOT).
5. **그래프 격리** — `project_id` 스코핑, catalog는 `packages/contracts` SSOT (기존 불변식 유지).

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
│ @ssota/studio-preview-    │    │ nodes.content (Postgres)      │
│ runtime (in every bundle) │◄──►│  files[], entry, dependencies │
│  STUDIO_READY / SELECT    │    │  + design_theme tokens        │
│  STUDIO_PATCH → DOM       │    └──────────────────────────────┘
│  inspect CSS              │              │
└───────────────────────────┘              │ debounced source patch
                ▲                          │
                │                          ▼
        ┌───────┴────────┐       ┌─────────────────────┐
        │ Build service   │       │ Supabase Storage     │
        │ esbuild + cache │──────►│ preview artifacts    │
        │ content-hash    │       │ (JS/CSS, source maps)│
        └────────────────┘       └─────────────────────┘
```

### 4.1 Preview 루프

```
1. Shell: ui_component source + design_theme 로드
2. Build API: hash(source + theme + deps) → 캐시 hit/miss
3. iframe: STUDIO_LOAD_BUNDLE { url, buildId }
4. User click → STUDIO_SELECT { nodeId, sourceRef? }
5. Inspector 변경 → STUDIO_PATCH { nodeId, patch }
   → iframe: DOM className 즉시 적용
   → parent: source 파일 해당 위치 patch (debounce)
6. (선택) 누적 변경 후 incremental rebuild → soft refresh
7. Deploy: GraphWritePort로 content 커밋 + published build 고정
```

### 4.2 `@ssota/studio-preview-runtime` (번들 공통)

| 모듈 | 역할 |
|------|------|
| `bridge` | `postMessage` — 기존 `packages/studio-renderer/protocol.ts` 확장 |
| `inspect-styles` | hover/selected outline (`studio-inspect-mode`) |
| `selection` | click → `STUDIO_SELECT` (이벤트는 capture, React와 충돌 최소화) |
| `patch-applier` | `STUDIO_PATCH` 수신 시 DOM 속성 즉시 반영 |
| `bootstrap` | `STUDIO_READY` 발송, interaction mode 수신 |

**빌드 주입:** entry 첫 줄 `import "@ssota/studio-preview-runtime/bootstrap"` 또는 esbuild `banner`/`inject`.

### 4.3 DOM ↔ Source 매핑

Inspector가 source를 고치려면 클릭한 DOM이 **어느 파일·어느 JSX**인지 알아야 한다.

| 방식 | 설명 |
|------|------|
| **A. Compile plugin (권장)** | swc/babel: JSX에 `data-studio-id` + `data-studio-loc="path:line:col"` 주입 |
| **B. Source map 역참조** | 클릭 요소 → generated offset → original TSX |
| **C. Layer index** | `content.layerIndex`에 id→{file, path} 사전 계산 (에이전트가 유지) |

초기 구현: **A + className patch만** → Typography/Layout/Spacing/Shadow inspector 재사용.

### 4.4 Protocol 확장 (안)

기존 메시지 유지 + 추가:

```ts
// Parent → iframe
{ type: "STUDIO_LOAD_BUNDLE", url: string, buildId: string }
{ type: "STUDIO_PATCH", nodeId: string, patch: StudioPatch, sourceRef?: SourceRef }

// iframe → Parent
{ type: "STUDIO_SELECT", nodeId: string, sourceRef?: SourceRef }
{ type: "STUDIO_LAYER_TREE", nodes: LayerTreeNode[] }  // optional, 마운트 후 1회
```

`STUDIO_SET_TREE` / `render-studio-tree`는 **wireframe·레거시** 또는 제거 대상.

---

## 5. 데이터 모델

### 5.1 `ui_component` content v2 (안)

```ts
{
  schemaVersion: 2,
  entry: "Component.tsx",
  files: {
    "Component.tsx": "export function ...",
    "utils.ts": "..."
  },
  dependencies: {
  "@ssota/ui": "workspace:*"
  },
  layerIndex?: Record<string, { file: string; name: string; kind: string }>
}
```

- **v1 `StudioNode` tree:** wireframe/initiative 스케치용으로만 유지하거나, `representation: "tree" | "source"` 공존.
- **Deploy:** `GraphWritePort` → `nodes.content` (기존 패턴).

### 5.2 `design_theme` (안)

Zod JSON tokens → 빌드 시 CSS variables + Tailwind theme entry 생성. iframe 하드코딩 `@ssota/ui` globals 대신 **프로젝트 theme entry** 사용.

---

## 6. 저장소 전략 (DB vs Storage)

| 데이터 | 저장 위치 | 이유 |
|--------|-----------|------|
| **Source bundle** (`files`, `entry`, `deps`) | **Postgres `nodes.content`** | 그래프 SSOT, MCP `update_node`, 버전·lifecycle |
| **Draft session** | `sessionStorage` + `properties.draft` (기존) | 편집 중 낙관적 UI |
| **Build artifact** (JS, CSS, source map) | **Supabase Storage** (content-addressed) | 대용량, CDN, DB bloat 방지 |
| **Build 메타** | `nodes.properties` 또는 `content.build` | `buildHash`, `storagePath`, `builtAt`, `previewUrl` |

**경로 예:** `{projectId}/studio-builds/{contentHash}/bundle.js`

- Preview 요청: hash 계산 → Storage hit → signed URL → iframe
- Miss: esbuild → Storage upload → 메타 갱신
- TTL: draft preview는 LRU/7일, published는 lifecycle까지 유지

**DB에 번들 본문을 넣지 않는다** (content text는 source만).

---

## 7. 좌측 Layers (Tree) 패널

**가능하다.** Preview가 빌드 DOM이어도 Layers는 유지한다.

| 소스 | Layers 데이터 |
|------|----------------|
| **권장** | Source AST 파싱 → `data-studio-id`와 동일 id 트리 (`layerIndex` 또는 실시간 parse) |
| **대안** | iframe 마운트 후 `STUDIO_LAYER_TREE` postMessage로 보고 |
| **동기화** | Layers 클릭 → `STUDIO_HIGHLIGHT` / iframe scroll-into-view; iframe 선택 → Layers highlight |

현재 `LayersPanel` + `walkStudioNodes(StudioNode)`는 v1용. v2에서는 **`walkLayerIndex(source)`** 또는 AST walker로 교체. UX(아이콘, depth, mono label)는 동일.

---

## 8. Build pipeline (서버)

1. **입력:** `files` + `design_theme` CSS entry + `packages/contracts`에서 허용된 deps
2. **도구:** esbuild (초기), 필요 시 Tailwind PostCSS 플러그인
3. **출력:** `bundle.js`, `bundle.css`, `bundle.js.map`
4. **캐시 키:** `sha256(source + themeVersion + lockfileSlice + studioRuntimeVersion)`
5. **API:** `POST /api/studio/build` → `{ url, buildId, cacheHit }`
6. **Preview page:** `GET .../design/preview?componentId=...` → shell iframe + bundle URL

Sandbox: Vercel Fluid / 로컬 worker; v0급 per-chat Next sandbox는 비용상 **esbuild 단일 번들** 우선.

---

## 9. Inspector 연동

- 기존 v0-style `tailwind-classname` parse/serialize **재사용**
- 패치 흐름: Inspector UI → `updateSourceClassName(sourceRef, next)` + `STUDIO_PATCH` → iframe
- `design_theme` 토큰 변경은 theme rebuild 트리거 (별도 패널)

---

## 10. MCP · 에이전트

- `create_node` / `update_node`로 `content.files` 멀티파일 작성
- 그래프 `composed_of`로 composite 참조 (기존과 동일)
- Inspector human edit ↔ source 동일 SSOT — 충돌 시 last-write + optional revision

---

## 11. 마이그레이션 · 단계

| 단계 | 내용 |
|------|------|
| **P0** | `studio-preview-runtime` 패키지 + protocol 확장 |
| **P1** | esbuild POC + Storage 업로드 + iframe `STUDIO_LOAD_BUNDLE` |
| **P2** | JSX `data-studio-id` 플러그인 + `STUDIO_PATCH` className → source |
| **P3** | Layers AST/layerIndex + theme entry |
| **P4** | v1 tree deprecate / wireframe only |

---

## 12. 비범위 (v1)

- 브라우저 Web Worker 빌드 (draft 전용)
- iframe 내 React state 로직 편집 (props/event handler inspector)
- npm 임의 registry (허용 목록만)
- `executeAction` / generic runtime 복원

---

## 13. 결정 사항 체크리스트

- [x] Preview = 빌드된 React만 (JSON DOM 렌더러는 편집 경로 아님)
- [x] 모든 번들에 studio-preview-runtime 포함
- [x] Source SSOT = `nodes.content` (DB)
- [x] Build artifact = Supabase Storage (content-hash)
- [x] Layers 패널 = source/AST 기반 트리 유지
- [ ] contracts v2 스키마 PR
- [ ] Storage bucket + RLS (서버 전용 업로드)
- [ ] esbuild POC

---

## 14. 참고 코드 (현재)

- Protocol: `packages/studio-renderer/src/protocol.ts`
- Preview bridge: `apps/web/components/console/design-studio/preview-bridge.ts`
- Layers: `apps/web/components/console/design-studio/layers-panel.tsx`
- Content v1: `packages/contracts/src/catalog/ui-component-schemas.ts`
