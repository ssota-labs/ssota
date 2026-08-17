# Notion-like Editor (Tiptap) — 설계 문서

> 상태: Draft · 브랜치: `feat/tiptap-notion-editor` · 작성일: 2026-06-17
> 스택: Next.js 16 / React 19 / Tailwind v4 / Supabase · UI: `@ssota/ui` (Base UI, preset `b2CimoD3a`)

## 1. 목표

Tiptap 3 기반으로 Notion 과 동등한 블록 에디터를 만든다. 핵심 UX 패리티:

- `/` 슬래시 메뉴로 블록 삽입
- 블록 좌측 drag handle(⋮⋮) + `+` 추가 버튼, 드래그 재정렬
- 텍스트 선택 시 bubble(floating) 툴바
- 블록 타입 전체: 헤딩, 리스트(불릿/번호/체크박스), 토글, 콜아웃, 인용, 코드블록, 구분선, 이미지/임베드, 테이블
- 마크다운 입력 단축(`#`, `-`, `>`, ``` ``` ```, `[]` 등)
- 멘션 `@`, 이모지 `:`
- JSON 영속화 + 자동 저장, (후속) 실시간 협업

---

## 2. 웹 사례 리서치 (Build vs Adopt)

| 옵션 | 기반 | 라이선스 | Notion 패리티 | 커스터마이즈 자유도 | 비고 |
|------|------|----------|---------------|---------------------|------|
| **공식 Tiptap "Notion-like" 템플릿** | Tiptap Pro | **유료** (Start plan 이상, Pro License) | ★★★★★ (협업·AI·코멘트 포함) | 중 | 프로덕션은 구독 필요, self-host 불가. 빠르지만 종속성·비용. |
| **BlockNote** (TypeCell) | Prosemirror + **Tiptap** | MPL-2.0 (XL 패키지는 GPL-3/상용) | ★★★★☆ (슬래시·드래그·중첩·협업 기본 제공) | 중 (자체 block schema 추상화) | "바로 쓰는 Notion". 빠르지만 Tiptap raw API 위에 한 겹 더 있음. |
| **Novel** (steven-tey) | Tiptap + Vercel AI SDK | Apache-2.0 | ★★★☆☆ (슬래시·bubble·AI 자동완성·이미지) | 높음 (복사해서 소유) | 라이브러리보다 "템플릿". AI 자동완성 레퍼런스로 우수. |
| **Notitap** | Tiptap | OSS | ★★★☆☆ | 높음 | 리사이즈 이미지/비디오, search&replace 레퍼런스. |
| **직접 구축 (raw Tiptap 3)** | Tiptap | MIT (core) | 빌드한 만큼 | **최고** | 본 설계의 채택안. 커스텀 노드(콜아웃/토글)·디자인시스템 통합 자유. |

### 권장안

**raw Tiptap 3 로 직접 구축**하되, **Novel/BlockNote 의 오픈소스 구현을 레퍼런스**로 활용한다.

- 이유: ① 이미 `@ssota/ui`(Base UI) 디자인 시스템이 있어 BlockNote 의 자체 UI/테마와 충돌 ② 콜아웃/토글/멘션을 SSOTA 도메인(노드·태스크·워크플로우)과 연결하려면 커스텀 노드가 필수 ③ 공식 Tiptap 템플릿의 핵심(협업·AI)은 유료이며 self-host 불가
- 단, **빠른 PoC 가 우선이면 BlockNote** 가 합리적 대안 (1주 내 동작). 본 설계는 직접 구축 기준으로 작성하고 §9 에 결정 포인트를 남긴다.

레퍼런스 repo 는 `.reference/tiptap`, `.reference/tiptap-docs` 에 클론됨 (gitignore 대상).

---

## 3. 현재 코드베이스 적합점

탐색 결과(`packages/contracts`, `packages/adapter-supabase`, `apps/web`):

| 콘텐츠 표면 | 현재 저장 | 현재 편집 UI | 에디터 적용 |
|-------------|-----------|--------------|-------------|
| **Node** (`nodes.content` TEXT, `properties` JSONB) | 평문/마크다운 문자열 | 없음/평문 | 1순위 — 풍부한 본문에 가장 적합 |
| **Workflow** (`workflows.spec` JSONB → `agentNotes` string) | 문자열 | `<Textarea>` (`workflow-settings-sheet.tsx`) | 2순위 — textarea 교체 |
| **Task** (`tasks.context`/`result` JSONB, `title`) | title 평문, context JSON | 읽기전용 시트 | 3순위 — 설명 필드 추가 |

데이터 접근 패턴(준수 대상): **Server Action → core use-case / port(예: `GraphWritePort`·`TaskPort`) → adapter ports → Supabase(Drizzle)**, 이후 `revalidatePath`. 예: `apps/web/app/[orgSlug]/[teamspaceSlug]/tasks/actions.ts` 의 `updateTaskStatusAction`. 에디터 저장도 이 흐름을 따른다(직접 supabase mutate 금지, 레거시 `executeAction` 사용 금지).

---

## 4. 아키텍처

### 4.1 패키지 구성 — `packages/editor` (신규)

디자인 시스템처럼 재사용 가능한 워크스페이스 패키지로 분리(노드·태스크·워크플로우 3곳에서 재사용).

```
packages/editor/
  src/
    SsotaEditor.tsx          # EditorProvider 래퍼 (immediatelyRender:false)
    extensions/
      index.ts               # StarterKit + 커스텀 확장 번들
      Callout.ts             # 커스텀 Node (콜아웃)
      Toggle.ts              # 커스텀 Node (접기/펼치기)
      SlashCommand.ts        # Suggestion 기반 / 메뉴
      DragHandle.ts          # @tiptap/extension-drag-handle-react
      Mention.ts             # @ 멘션 → SSOTA 노드 링크
    ui/
      BubbleToolbar.tsx      # @tiptap/react BubbleMenu
      SlashMenu.tsx          # @ssota/ui Command 사용
      DragHandleMenu.tsx     # @ssota/ui DropdownMenu
    serialize/
      json.ts                # getJSON / setContent, zod 스키마
      markdown.ts            # (후속) md ↔ doc
  package.json               # 모든 @tiptap/* 동일 버전 핀
```

UI 프리미티브는 **새로 만들지 않고** `@ssota/ui` 재사용: 슬래시 메뉴 = `command.tsx`, bubble/drag 메뉴 = `dropdown-menu.tsx`/`popover.tsx`. 아이콘 = `@phosphor-icons/react`.

### 4.2 영속화 포맷

- 저장 단위: **Tiptap JSON(ProseMirror doc)** 을 그대로 JSONB 에 저장.
  - Node: `nodes.properties.contentDoc` (JSONB) 신설 또는 `nodes.content` 를 JSONB 컬럼으로 마이그레이션. 평문 호환을 위해 초기에는 `properties.contentDoc` 권장.
  - Workflow: `spec.agentNotesDoc` (JSON) 추가, 기존 `agentNotes` string 은 평문 fallback/검색용으로 유지.
- 검증: zod 로 doc 루트(`{ type: "doc", content: [...] }`) 형태만 얕게 검증 + 서버에서 길이/노드화이트리스트 가드. 신뢰 경계는 서버 액션.
- 렌더링(읽기 전용/SSR): `@tiptap/static-renderer` 또는 `generateHTML(json, extensions)` 로 서버에서 HTML 생성 → 에디터 번들 없이 표시.

### 4.3 SSR (Next.js 16 / React 19)

- `immediatelyRender: false` 필수(스킬 가이드, 미설정 시 hydration crash).
- 에디터 컴포넌트는 `"use client"`. 페이지/시트는 서버 컴포넌트로 데이터 fetch 후 초기 JSON 을 prop 으로 주입.
- React Composable API(`EditorProvider` + `useCurrentEditor`) 사용.

---

## 5. 확장(Extension) 매트릭스 — Notion 패리티

| 기능 | 확장 | 비고 |
|------|------|------|
| 문단/헤딩/볼드/이탤릭/리스트/코드/인용/HR | `@tiptap/starter-kit` | 기본 |
| 체크박스 리스트 | `@tiptap/extension-task-list` + `task-item` | |
| 텍스트 정렬·색상·하이라이트 | `text-align`, `color`, `highlight` | bubble 툴바 |
| 링크 | `@tiptap/extension-link` | bubble |
| 이미지/리사이즈 | `image` (+ Notitap 레퍼런스) | 업로드는 Supabase Storage |
| 테이블 | `table`, `table-row/cell/header` | |
| 코드블록 하이라이트 | `code-block-lowlight` | |
| 플레이스홀더 | `placeholder` | "/ 를 눌러 입력" |
| 슬래시 메뉴 | `@tiptap/suggestion` 기반 커스텀 | §6 |
| Drag handle / + 버튼 | `@tiptap/extension-drag-handle-react` | §6 |
| 멘션 `@` / 이모지 `:` | `mention`, `emoji` | @ → 노드 링크(도메인 통합) |
| **콜아웃 / 토글** | **커스텀 Node** | Notion 고유, NodeView(React) |
| 협업(후속) | `@tiptap/extension-collaboration` + Yjs | §7 |

> 모든 `@tiptap/*` 패키지는 **동일 버전(3.x)** 으로 핀 (스킬 필수 규칙).

---

## 6. 핵심 인터랙션 설계

- **슬래시 메뉴**: `Suggestion` 플러그인으로 `/` 트리거 → `@ssota/ui` `Command` 리스트 렌더(필터/키보드 네비 무료). 항목 선택 시 `editor.chain().focus().<command>().run()`.
- **Bubble 툴바**: `@tiptap/react` 의 `BubbleMenu` + `shouldShow` 로 텍스트 선택 시만. 버튼은 `@ssota/ui` Button(toggle 상태).
- **Drag handle**: `extension-drag-handle-react` 로 hover 시 좌측 핸들 렌더. 클릭 시 `DropdownMenu`(블록 타입 변경/복제/삭제), `+` 버튼은 빈 블록 삽입 후 슬래시 메뉴 오픈.
- **커스텀 노드(콜아웃·토글)**: `Node.create()` + `ReactNodeViewRenderer` 로 React NodeView. 토글은 `open` attr 로 접힘 상태 영속화.

---

## 7. 협업 (후속 단계)

- 라이브러리: `Collaboration` + `CollaborationCursor` + **Yjs**.
- 트랜스포트 선택지: ① Tiptap Cloud(유료, 가장 빠름) ② **Supabase Realtime + y-supabase / 자체 y-websocket** (self-host, 비용↓). SSOTA 는 이미 Supabase Realtime 사용 → 자체 호스팅 권장.
- 단일 편집(MVP)에서는 미적용. JSON 저장 시 낙관적 락(`updatedAt`)으로 충돌 감지.

---

## 8. 단계별 로드맵

- **Phase 0 — 스파이크 (0.5주)**: `packages/editor` 스캐폴드, StarterKit + Placeholder 만 붙인 최소 에디터를 `/studio` 한 곳에 마운트, SSR(`immediatelyRender:false`) 검증.
- **Phase 1 — 코어 에디터 (1.5주)**: 슬래시 메뉴, bubble 툴바, drag handle, 전체 기본 블록(헤딩/리스트/체크박스/코드/인용/HR/이미지/테이블), 마크다운 입력 단축. JSON 영속화 + 자동 저장(server action). 1순위 표면 = **Node 본문**.
- **Phase 2 — Notion 고유 (1주)**: 콜아웃/토글 커스텀 노드, 멘션 `@`(노드 링크), 이모지, 이미지 Supabase Storage 업로드. Workflow textarea 교체.
- **Phase 3 — 협업/AI (선택)**: Yjs 협업, AI 슬래시 액션(Vercel AI SDK, Novel 레퍼런스), 코멘트.

---

## 9. 결정 사항 (2026-06-17 확정)

1. ✅ **직접 구축**: raw Tiptap 3 로 `packages/editor` 구축 (BlockNote/공식 템플릿 미채택).
2. ✅ **첫 적용 표면**: **Node 본문** (`nodes.content`). 이후 Workflow → Task 로 확장.
3. **영속화 컬럼**: `nodes.properties.contentDoc`(JSONB, 무마이그레이션)로 시작. — Phase 1 착수 시 최종 확정.
4. **협업 시점**: MVP 는 단일 편집 + `updatedAt` 낙관적 락. Yjs 협업은 Phase 3.
5. **AI 통합**: Phase 3 선택 사항으로 보류.

## 10. 다음 액션 (Phase 0 스파이크)

1. `packages/editor` 워크스페이스 스캐폴드 (package.json, tsconfig, 모든 `@tiptap/*` 3.x 핀)
2. `SsotaEditor.tsx` — `EditorProvider` + StarterKit + Placeholder, `immediatelyRender:false`
3. `/studio` 한 곳에 마운트해 SSR 동작 검증 (hydration crash 없음 확인)
4. 검증 후 Phase 1(슬래시 메뉴·bubble·drag handle·영속화) 진입
