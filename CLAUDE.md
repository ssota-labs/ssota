# CLAUDE.md

> 이 파일은 [AGENTS.md](AGENTS.md)와 동일 내용을 유지한다 (Claude Code 진입점). 수정은 AGENTS.md에 먼저 하고 이 파일에 복제한다 — `pnpm harness:docs`가 동기화를 검증한다.

## Teamspace Overview

SSOTA는 더 이상 범용 컨텍스트 그래프 런타임을 active product로 구현하지 않는다. Active product는 개발 에이전트를 찾는 일반 사용자와 개발자를 위한 **개발 워크플로우 작업 공간**이다.

Active DB/runtime keep set은 `profiles`, `organizations`, `organization_memberships`, `projects`, `tasks`, `accounts`, `account_memberships`, `account_connections`, `node_catalog`, `edge_catalog`, `nodes`, `edges`다. **L1 데이터 catalog**(`node_catalog`, `edge_catalog`)는 project-scoped DB 테이블이며 uuid PK + `key`(project 내 unique)다. **L2 UI catalog**는 `packages/contracts/ui-catalog`(code, json-render). **L3 페이지**·**L4 워크스페이스 네비**는 `page`/`workspace` catalog key graph 노드(`properties.spec`·`properties.nav`). dev-workflow 시드 pack SSOT는 `packages/contracts/seed-packs/software-development-workflow/`다. 과거 generic graph/catalog/action/workflow runtime 코드는 이 저장소에서 제거되었다 — 복원·의존 금지 ([ARCH-03], 아래 Legacy Runtime 절).

기획·스펙의 SSOT는 Notion의 SSOTA-on-SSOTA 개발 Playbook이다. 일반 코딩 작업은 MCP가 아니라 이 저장소의 개발 워크플로우 명령으로 수행한다.

### Stack

- TypeScript (최신), Zod, Drizzle ORM, Next.js 16, Tailwind, shadcn/ui
- Supabase: 로컬 docker(`supabase` CLI) + 리모트 배포 + branching, OAuth 2.1 Server(MCP 인증)
- Turborepo + pnpm workspaces, nvm(`.nvmrc`)
- 테스트: Vitest(unit·integration) + Playwright(e2e)

## Architecture — Hexagonal (불변)

Active product는 Console v2.7 그래프 + tasks 워크플로우다. 과거 generic runtime(`executeAction`·Gate·Action Log)은 저장소에서 제거되었으며 복원하지 않는다 ([ARCH-03]).

```
apps/
  web/                  # Next.js 16 — Console v2.7 UI + Supabase Auth
  mcp/                  # Next.js 16 — account/project/task + graph query MCP
packages/
  core/                 # CatalogReadPort, GraphReadPort, GraphWritePort, graph use-cases
  adapter-postgres/     # Drizzle 스키마·시드, createGraphPorts / createTaskPort
  adapter-supabase/     # Supabase 래퍼 (adapter-postgres 사용)
  contracts/            # L2 ui-catalog, page/workspace Zod, seed-packs/dev-workflow, graph/* DTO
  config/
supabase/
e2e/
```

**의존 방향 [ARCH-01]:** `apps/* → core ← adapter-postgres/adapter-supabase`. `packages/core`는 IO 의존 0. apps는 adapter 내부 경로(deep import)를 참조하지 않는다 [ARCH-02].

**Adapter 진입점 (active):** `createGraphPorts(db, { organizationId, teamspaceId, accountId? })` → `{ catalog, graphRead, graphWrite }`. Catalog read는 `organizationId`, instance read/write는 `teamspaceId`(+ org-shared `teamspace_id IS NULL`). `accountId`가 있으면 end-user scope(shared `account_id IS NULL` + own rows). `createDbAccountReadPort(db)` → `provisionForUser`, `assertAccountAccess`, `getOrCreateWorkspaceAccount`.

## Console v2.7 Graph Invariants — 협상 불가 (active)

1. **[GRAPH-01] 4계층 catalog** — L1 `node_catalog`/`edge_catalog`(DB, **org-scoped** `organization_id` + project 내 unique `key`); L2 `packages/contracts/ui-catalog`(code); L3 `page` graph nodes(`properties.spec` + `bindings`); L4 `workspace` singleton(`properties.nav` → page node ids). 출시 Console은 읽기 전용 + hardcoded nav fallback; catalog 편집은 lab only (`CATALOG_LAB_ENABLED`).
2. **[GRAPH-02] 그래프 쓰기는 `GraphWritePort` (또는 core graph use-case)로만 한다.** apps/MCP에서 Drizzle·`nodes`/`edges` 직접 CRUD export 금지.
3. **[GRAPH-03] Catalog는 `organization_id`로 격리, 인스턴스는 `teamspace_id`로 귀속** — `nodes.teamspace_id`/`edges.teamspace_id` nullable = org-shared instance. Edge endpoints는 **같은 org**면 teamspace가 달라도 허용(cross-teamspace link). Cross-org → `ORG_MISMATCH`.
4. **[GRAPH-04] 인스턴스 → catalog FK only** — `nodes.node_catalog_id`, `edges.edge_catalog_id`. `node_type`/`edge_type` text 컬럼 없음. API는 `catalogKey`(또는 `nodeCatalogId`/`edgeCatalogId`)로 생성·조회.
5. **[GRAPH-05] 타입·properties 검증은 API 동작이다.** catalog에 없는 `catalogKey`·`property_schema` 위반 properties는 커밋 전 reject. edge domain/range는 `edge_catalog.domain_catalog_ids`/`range_catalog_ids`로 검증.
6. **[GRAPH-06] 노드 봉투 = `title` + `properties` only** — `content`·`lifecycle_status` DB 컬럼 없음. BlockNote 본문·lifecycle·ui_component spec 등은 dev-workflow convention으로 `properties.content`, `properties.lifecycleStatus`, `properties.spec`/`componentTree`에 저장. 읽기 헬퍼: `readNodeContent()`, `readLifecycleStatus()` (`packages/core`).
7. **[GRAPH-07] 시드 pack** — `packages/contracts/seed-packs/software-development-workflow/`(L1 catalog + pages + workspace). `seedDevWorkflowCatalog` + `applyDevWorkflowPack`이 onboarding·`pnpm db:seed`에서 호출.
8. **[GRAPH-08] 페이지 UI는 json-render 조합만** — L3 `page.properties.spec`은 L2 catalog 컴포넌트(`DocumentEditor`, `DataTable`, `ArtifactWorkbench` 등)를 `bindings`·`actions`와 함께 선언적으로 조합한다. 도메인 전용 React 페이지·라우트(`DesignStudioPage`, `/design/ui-components/[id]` 등)를 추가하지 않는다. URL 선택은 `url_selection` binding + `SelectionProvider`로 처리한다.

**명시적 비범위 (v1):** `executeAction`, Action Catalog DB, Human Gate, `action_log`, MCP `execute_action`.

## Legacy Runtime — 복원 금지

**[ARCH-03]** 과거 generic runtime의 불변식(`executeAction` 단일 쓰기, ActionCommitPort+log 단일 트랜잭션, 4대 강제, Gate)은 **active product에 적용하지 않는다**. 해당 코드·패턴을 복원하거나 의존하지 말 것. 필요하면 git 히스토리에서 참고만 한다.

## Tenancy & Security — Builder / End-user + `teamspace_id`

Active product는 **두 가지 Console 모드**를 지원한다. 격리 SSOT는 여전히 `teamspace_id`이며, end-user 모드에서 추가로 **per-user `account_id`** 파티션이 적용된다.

| 모드 | URL | 인증 | Graph scope | Chat/Connect account |
|------|-----|------|-------------|----------------------|
| **Builder** | `/{orgSlug}/*` (flat; teamspace는 sidebar·page context) | `organization_memberships` | `accountId` 없음 (teamspace + org-shared) | shared `workspace` (slug `workspace`) |
| **End-user** | `/app/{orgSlug}/{teamspaceSlug}/*` | Supabase 로그인 + `teamspaces.app_enabled` | `accountId` = personal (`user-{userId}`) | personal account (동일) |

```plain text
Organization (예: ssota-labs)
├── Teamspace: ssota-dev (app_enabled=true)
│   ├── Builder Console  → /ssota-labs/... (TeamspaceNav sidebar)
│   └── End-user App     → /app/ssota-labs/ssota-dev/...  (Pages / Chat / Tasks / Connections)
└── Teamspace: app-disabled (app_enabled=false) → /app/... 는 404
```

### `teamspaces.app_enabled` (end-user 진입 게이트)

**한 줄**: 배포 UI 없이 `/app` end-user 진입을 **teamspace** 단위로 열고 닫는 스위치.

- 테이블: `teamspaces` (구 `projects` rename)
- 컬럼: `teamspaces.app_enabled boolean NOT NULL DEFAULT false`
- `false`: `/app/{orgSlug}/{teamspaceSlug}` → **404** (Builder `/{orgSlug}/...`는 무관)
- `true`: 로그인 유저 → `AccountReadPort.provisionForUser` → personal account + AppShell
- MVP: `pnpm db:seed`, admin script, E2E fixture만 `true` 설정 (Console UI 토글 없음)
- 향후 “배포하기” 버튼이 이 플래그를 켠다

### Account 규칙

- **D1 per-user**: `slug = user-{profileId}`, project당 유저당 account 1개. 첫 `/app` 방문 시 idempotent provision + `account_memberships`.
- **D5 template read**: `nodes.account_id IS NULL` = builder가 심은 shared 템플릿(읽기). end-user write는 own `account_id`만; shared row update는 write port에서 `FORBIDDEN`.
- **D6 경로 분리**: org 멤버도 `/app`에서는 end-user scope (builder scope로 승격하지 않음).
- **API**: Chat/Connect/Agent API는 `resolveApiAccountScope`로 서버가 `accountId` 재해석. 클라이언트 body `accountId` 단독 신뢰 금지.

### `teamspace_id` 규칙

- **teamspace-scoped instances** — `nodes`/`edges`/`pages`/`tasks`/`accounts`는 **`teamspace_id`**. L1 catalog는 **`organization_id`**. adapter는 `createGraphPorts(db, { organizationId, teamspaceId, accountId? })` / `createTaskPort(db, { teamspaceId, accountId? })`.
- **Builder Console** — `accountId` 생략 → current teamspace instances + org-shared(null).
- **End-user `/app`** — `accountId` 필수 → shared(null) + own partition.
- **쓰기**: core graph use-case + `GraphWritePort` only.
- **조회**: MCP·Builder는 org membership + project slug. End-user MCP는 **비범위** (builder-only).

Console URL `[orgSlug]`(flat)와 MCP `orgSlug` + `teamspaceSlug`(explicit write scope)가 builder 격리 SSOT다. Page render는 `page.teamspace_id`가 teamspace context를 imply한다. End-user는 `/app/[orgSlug]/[teamspaceSlug]`.

### Postgres RLS — 전 테이블 deny-all (의도적)

**[SEC-01]** SSOTA 테이블(`profiles`, `organizations`, `teamspaces`, `organization_memberships`, …) **전부 RLS deny-all**.

1. **격리 SSOT**: core use-case + 서버 `teamspaceId` (+ end-user `accountId`) + org/account membership 검증.
2. **서버만 DB 접근**: `DATABASE_URL` / `createAdminDb`, RLS bypass.

### Defense in depth (서버사이드)

```
[Builder org 멤버] → /org/project → GraphWritePort (no accountId)
[End-user 로그인]  → /app/org/project (app_enabled) → GraphWritePort (personal accountId)
[Chat/Connect API] → resolveApiAccountScope (Referer/returnTo /app/ → end_user)
                      ↓
              [adapter-supabase — createAdminDb]
```

- **금지**: anon PostgREST로 `nodes`/`edges` 직접 노출, permissive RLS.
- **필수**: graph read/write는 apps/MCP 핸들러 경유; account 격리 integration·E2E (`end-user-app`).

### 비범위 (배포 단계)

배포하기 UI, `deployments` 테이블, 커스텀 도메인 middleware, Vercel Domains API — 후속 PR.

## Setup Commands

```bash
nvm use                      # .nvmrc 기준 Node 버전
pnpm install                 # 전체 워크스페이스 의존성
supabase start               # 로컬 Supabase docker 기동
pnpm db:migrate              # Supabase 마이그레이션 적용 (supabase migration up --local)
pnpm db:seed                 # smoke 계정 + console org/project + graph 인스턴스 시드 (catalog DB 시드 없음)
```

- 환경변수는 각 앱의 `.env.example`을 복사해 `.env.local` 작성. 로컬 Supabase 기동 후 `pnpm sync:env`로 `supabase status` 키를 자동 반영한다 (`cloud:prepare`가 세션마다 실행). 시크릿은 절대 커밋하지 않는다.
- Supabase OAuth 2.1 Server는 `supabase/config.toml`의 `[auth.oauth_server] enabled = true`, `allow_dynamic_registration = true`로 설정한다.

## Development Workflow

```bash
pnpm dev                     # turbo run dev — web + mcp 동시 기동
pnpm dev --filter web        # 콘솔만
pnpm dev --filter mcp        # MCP 앱만
pnpm design-lab              # Design Lab (apps/design-lab, port 6007)
pnpm build                   # turbo run build (전체)
pnpm lint && pnpm typecheck  # 린트 + 타입 체크
```

- 패키지 추가는 `pnpm add <pkg> --filter <workspace>` 사용.
- 스키마 변경 시: `packages/adapter-supabase`에서 Drizzle 스키마 수정 → `pnpm db:generate`로 SQL diff 생성 → `supabase/migrations/`에 `pnpm db:migration:new <name>`으로 파일 추가( diff SQL 이식) → `pnpm db:migrate`. Drizzle은 스키마 정의·diff용, **적용 SSOT는 `supabase/migrations/`** (branching 호환).

## Frontend 작업 완료 정의 (에이전트·PR 공통)

**[PR-03]** `apps/web`·`packages/ui` 등 **사용자에게 보이는 UI를 바꾸는 작업**은 코드 커밋만으로 끝나지 않는다. 아래 4단계를 모두 마쳐야 **완료**다. 사용자가 스크린샷·데모를 따로 요청하지 않아도 에이전트가 끝까지 수행한다.

```
1. 구현 + 정적 검증
2. E2E (Playwright — 자동 스크린샷·비디오·HTML 리포트)
3. 대화형 UI 검증 (agent-browser 또는 Computer Use)
4. PR/요약에 산출물 첨부
```

### UI 검증 우선순위

| 순위 | 도구 | 역할 |
|------|------|------|
| **1** | **Playwright E2E** (`pnpm e2e`) | 기능·회귀 SSOT. 성공/실패 모두 스크린샷·비디오·trace 기록 + HTML 리포트 |
| **2** | **agent-browser** | E2E 이후 탐색적 검증·스크린샷·녹화. dev 서버(:3000) 대상 |
| **3** | **Computer Use** (`computerUse` 서브에이전트, `RecordScreen`) | E2E 이후 실제 화면 조작·스크롤·모달·네비 탐색·데모 녹화 |

Playwright가 커버하지 못하는 **시각·탐색·인터랙션**은 agent-browser 또는 Computer Use로 보강한다. 둘 다 E2E를 대체하지 않는다.

### 1. 구현 + 정적 검증

- `pnpm lint && pnpm typecheck` (변경 범위에 맞게)
- `apps/web`만 건드렸으면 `pnpm --filter web typecheck`
- 디자인 규칙: [DESIGN.md](DESIGN.md), `@ssota/ui` semantic tokens

### 2. E2E

- 변경한 화면·플로우에 맞는 Playwright 스펙을 실행한다. 신규 UX면 **테스트 추가**를 우선 검토한다.
- **사용자 UI 피드백(버그·UX 개선)은 같은 PR에 E2E를 반드시 추가한다.** 피드백 항목과 테스트명(`pnpm e2e --grep '<키워드>'`)을 PR 설명에 1:1로 적는다. Editor Lab·`@ssota/editor`는 `e2e/tests/editor-lab.spec.ts`.
- 실행 전: Cloud는 `pnpm cloud:prepare`, 로컬은 `pnpm e2e:prepare` 또는 `supabase start` + migrate + seed.
- **`pnpm e2e`** = Playwright 실행 → `scripts/e2e-artifacts.sh`로 `/opt/cursor/artifacts/e2e/latest`에 산출물 복사 → (로컬·DISPLAY 있을 때) HTML 리포트 자동 오픈. CI/Cloud 무인 실행은 `pnpm e2e:ci` (`--no-report`).
- `pnpm e2e`는 **3100/3101**에서 자체 `next dev`를 띄운다. `pnpm dev` tmux 세션이 3000/3101을 쓰면 E2E 전에 `tmux kill-session -t ssota-dev`로 내린다.
- 관련 테스트만 돌릴 때: `pnpm e2e -- --grep '<키워드>'` (예: `--grep onboarding`).
- 실패 시 수정 후 재실행. E2E 산출물·리포트 규칙은 아래 **E2E 리포트** 절을 따른다.

### 3. 대화형 UI 검증 (agent-browser / Computer Use)

E2E 통과 후, 변경 플로우를 **사람처럼** 다시 훑는다. 스크롤·호버·모달·사이드바 전환 등 E2E assertion 밖의 시각·UX 이슈를 잡는다.

**agent-browser**

- 스킬: `.agents/skills/agent-browser/SKILL.md` — 실행 전 `agent-browser skills get core`.
- 설치: `npm i -g agent-browser && agent-browser install`.
- dev 서버: `pnpm dev --filter web` (:3000). E2E 직후 tmux로 재기동.
- 뷰포트: `agent-browser set viewport 1440 900 2`.
- 플로우별 스크린샷 + 필요 시 **녹화**(agent-browser video / 단계별 캡처).
- 저장: `/opt/cursor/artifacts/screenshots/`, `/opt/cursor/artifacts/videos/`.

**Computer Use**

- `Task` 서브에이전트 `subagent_type=computerUse`로 변경 화면을 실제 조작한다.
- 네비게이션·스크롤·폼·모달 등 **탐색적** 검증에 적합. E2E 스펙에 넣기 애매한 UX도 여기서 확인.
- 움직이는 플로우는 `RecordScreen`으로 데모 녹화 (`/opt/cursor/artifacts/`).
- Cloud Agent에서도 사용 가능 (아래 `.cursor/CLOUD.md`).

**agent-browser 최소 예시**

```bash
agent-browser set viewport 1440 900 2
agent-browser open http://localhost:3000/onboarding/profile
agent-browser wait --load networkidle
agent-browser screenshot --full /opt/cursor/artifacts/screenshots/onboarding-step1.png
agent-browser close
```

### 4. PR/요약 시각 보고

- `/opt/cursor/artifacts/e2e/latest/`(Playwright) + `/opt/cursor/artifacts/screenshots/`·`videos/`(agent-browser/Computer Use)에서 **스크린샷 2–4장**, **대표 비디오 1개**를 PR/요약에 첨부 (markdown `<img>` / `<video>`, 절대 경로).
- 무엇을 바꿨는지 한 줄 요약 + 캡처가 보여주는 상태 설명.
- E2E `--grep` 키워드, agent-browser/Computer Use로 확인한 항목.
- 실패했던 경우: 수정 내용과 재실행 결과.

### 완료 체크리스트 (프론트 PR)

- [ ] UI 구현 및 lint/typecheck 통과
- [ ] `pnpm e2e` (또는 Cloud `pnpm e2e:ci`) — 산출물 `/opt/cursor/artifacts/e2e/latest`
- [ ] agent-browser 또는 Computer Use로 변경 플로우 탐색·녹화
- [ ] PR/요약에 스크린샷·비디오 첨부
- [ ] 커밋·푸시·PR 업데이트

## Console v2.7 PR 순서 (graph foundation)

Notion [Console v2.7 구현 계획](https://app.notion.com/p/380346dac456810c8a7ef9f7b4cf86de) §7.2 기준. PR 1–3(graph foundation) 완료 후 PR 4+(Console UI) 진행.

| PR | 범위 | 검증 |
|---|---|---|
| PR1 | `packages/contracts` catalog + `CatalogReadPort` | `pnpm test --filter @ssota/contracts` `pnpm test --filter @ssota/core` |
| PR2 | `nodes`/`edges` migration + instance seed | `pnpm test --filter @ssota/adapter-supabase` |
| PR3 | `GraphReadPort`/`GraphWritePort` + `createGraphPorts` + AGENTS.md | 위 전부 |

**Console UI (PR 4+)** — Notion §7.2의 **PR 번호 하나 = GitHub PR 하나**. 여러 마일스톤·기능 묶음을 한 PR에 넣지 않는다.

| PR (예) | 범위 (요약) | base |
|---|---|---|
| PR7 | graph loaders/actions + execution·research·executive 화면 | `main` (PR6 머지 후) |
| PR8 | product L1 + initiative CRUD + evergreen | `main` (PR7 머지 후) |
| PR9 | initiative L2 18화면 + scoped loader | `main` (PR8 머지 후) |

공통 인프라(`lib/graph/`, 공용 컴포넌트)는 **해당 시퀀스의 첫 PR**(예: PR7)에만 넣고, 이후 PR은 그 위에 화면·E2E만 추가한다.

**Historical:** Phase 1 MVP 마일스톤 M0–M6(generic runtime)은 저장소에서 제거됨 (git 히스토리 참고).

## MVP 마일스톤 (historical — generic runtime)

Phase 1 구현 계획(`ssota_mvp_구현_c63c2b4a.plan.md`)의 **마일스톤(M0–M6) 하나가 끝날 때마다** git 커밋을 남긴다. 한 PR에 여러 마일스톤을 섞지 않는다.

| 마일스톤 | 접두사 | 포함 범위 | 커밋 전 확인 |
|---|---|---|---|
| M0 | `[infra]` | turbo/pnpm/nvm, `packages/config`, `supabase/config.toml`, 루트 `package.json`·`tsconfig` | `pnpm install` |
| M1 | `[core]` | `packages/contracts`, `packages/core` | `pnpm test --filter core` |
| M2 | `[adapter]` | `packages/adapter-supabase` (+ `supabase/migrations/`) | `pnpm --filter @ssota/adapter-supabase build` |
| M3 | `[mcp]` | `apps/mcp` | `pnpm --filter mcp typecheck` |
| M4 | `[web]` | `apps/web` | `pnpm --filter web typecheck` |
| M5 | `[e2e]` | `e2e/` | `pnpm e2e` (Supabase·앱 기동 후) |
| M6 | `[dogfood]` | `scripts/m6-notion-migration.ts`, `migrate:notion` 스크립트 | `pnpm migrate:notion` |

**커밋 메시지 형식**

```
[infra|core|adapter|mcp|web|e2e|dogfood] why 중심 한 줄

- M<n> 완료: …
```

**규칙**

- 마일스톤 완료 직후 **해당 마일스톤 파일만** 스테이징한다.
- 커밋 전 해당 마일스톤의 **최소 검증 명령**을 실행하고, 실패 시 커밋하지 않는다.
- `.env.local`·시크릿·`node_modules`·`dist`는 커밋하지 않는다.
- plan 파일의 todo 상태만 유지하고, **커밋 정책 SSOT는 [Git 커밋 정책](#git-커밋-정책)** 이다 (마일스톤당 1커밋은 그 특례).

## Testing Instructions

테스트는 3층이며, 층마다 인증 방식이 다르다.

| 층 | 명령 | 인증 | 대상 |
|---|---|---|---|
| Unit | `pnpm test --filter @ssota/core` | 없음 | catalog Zod, `ORG_MISMATCH`, graph use-case 거부 |
| Integration | `pnpm test --filter @ssota/adapter-postgres` | **smoke 계정** | graph CRUD, RLS deny-all, initiative bundle, seed 무결성 |
| E2E | `pnpm e2e` | **smoke 계정** | Console onboarding·tasks (graph UI E2E는 PR 4+) |

- **[ENV-01] Smoke 계정**: `smoke@ssota.ai` — 시드 단계에서 Auth Admin API로 생성되는 전용 테스트 사용자. integration·e2e는 반드시 이 계정으로만 인증한다. 실제 사용자 계정이나 service key 우회로 테스트하지 않는다.
- Integration·e2e 실행 전 `supabase start`가 떠 있어야 한다. **로컬**에서는 `pnpm e2e:prepare` (= supabase start + migrate + seed). **Cursor Cloud**에서는 세션마다 `pnpm cloud:prepare`로 Docker·Supabase·시드를 한 번에 부트스트랩한다 (`scripts/cloud-bootstrap.sh`). `pnpm e2e` global setup은 smoke 로그인 실패 시 migrate+seed만 자동 재시도한다 (`e2e/global-setup.ts`) — Cloud에서 Docker가 안 떠 있으면 `cloud:prepare`가 필요하다.
- E2E 로그인은 `e2e/helpers/auth.ts`의 `loginAsSmoke()`를 사용한다 — 헤더의「로그인」링크와 폼 submit 버튼 이름이 같아 `getByRole('button', { name: '로그인' })` 단독 사용 시 strict mode violation이 난다.
- **[TEST-01]** 새 강제 규칙·포트를 추가하면 **거부 케이스 테스트가 필수다.** 통과 케이스만 있는 PR은 불완전하다.
- "비기록 변경 0건"(Phase 1 exit criteria)은 integration에서 구조적으로 검증한다: 로그 없이 커밋되는 경로가 존재하지 않음.

### E2E 리포트 (에이전트·PR 공통)

E2E를 실행한 턴(특히 web/studio/e2e 변경 PR)에서는 **스크린샷·비디오·HTML 리포트**를 사용자에게 제공한다. 매번 요청받지 않아도 된다.

**실행**

```bash
# dev 서버 tmux 세션이 3000/3001을 쓰면 e2e 전에 종료 (Playwright는 3100/3101 사용)
cd e2e && pnpm exec playwright install chromium   # 최초 1회
pnpm e2e              # 테스트 + artifacts 복사 + (로컬) HTML 리포트 오픈
pnpm e2e:ci           # CI/Cloud: 리포트 오픈 생략, artifacts만
pnpm e2e -- --grep onboarding
```

**산출물 경로** (`e2e/playwright.config.ts` + `scripts/e2e-artifacts.sh`)

| 종류 | 경로 |
|---|---|
| HTML 리포트 (원본) | `e2e/report/html/index.html` |
| 에이전트 복사본 (latest) | `/opt/cursor/artifacts/e2e/latest/` |
| 스크린샷 | `…/latest/screenshots/` |
| 비디오 | `…/latest/videos/` |
| trace | `…/latest/traces/` |
| JSON 요약 | `…/latest/results.json` |

**에이전트 응답 규칙**

- E2E 실행 후 PR/작업 요약에 **주요 스크린샷 2–4장**과 **대표 플로우 비디오 1개**를 첨부한다. Playwright 산출물은 `pnpm e2e`가 `/opt/cursor/artifacts/e2e/latest/`에 자동 복사한다. agent-browser·Computer Use 산출물은 `screenshots/`·`videos/`에 저장.
- 실패 시 HTML 리포트 경로와 실패 테스트명·스크린샷을 함께 남긴다.
- `e2e/report/`는 `.gitignore` 대상 — 커밋하지 않는다.

## Code Style

- TypeScript strict 모드. `any` 금지, 외부 입력은 Zod(`packages/contracts`)로 파싱.
- Zod 스키마는 `packages/contracts`에 정의하고 core/apps가 공유한다 — 스키마를 앱에 중복 정의하지 않는다.
- 도메인 용어 (Console v2.7): `CatalogReadPort`, `GraphReadPort`, `GraphWritePort`, `catalogKey`, `nodeCatalogId`, `edgeCatalogId`, `properties.lifecycleStatus`. Legacy: `node_type`·`executeAction`·`gate`는 archive/마이그레이션 맥락에서만.
- 파일 코멘트·문서는 한국어, 식별자는 영어.
- UI는 `@ssota/ui` (`packages/ui`) shadcn Base UI 컴포넌트 우선. `pnpm dlx shadcn@latest add <component> -y -c apps/web`로 추가. 디자인 규칙은 루트 [DESIGN.md](DESIGN.md) 및 `.cursor/rules/design.mdc` 참조.

## MCP App Notes (apps/mcp)

- 엔드포인트는 `/api/mcp` (Streamable HTTP, `mcp-handler` + `@modelcontextprotocol/sdk`).
- Active MCP scope는 account/project discovery, development workflow `tasks` CRUD, **workflow instruction fetch** (`list_workflows`, `get_workflow`, `get_workflow_instruction`), **graph read/write** (`list_node_types`, `get_node_type`, `list_edge_types`, `query_nodes`, `get_node`, `traverse_edges`, `create_node`, `update_node`, `create_edge`)다. `create_node`/`update_node`는 `catalogKey` + `properties`(content/lifecycle은 properties convention). Workflow instruction SSOT는 `packages/contracts/workflows`이며 MCP를 통해 배포 버전을 fetch한다. Graph write는 core graph use-case 경유. Generic action/workflow runtime tools(`execute_action`, gates)는 archived.
- 일반 구현 작업에서 `ssota-mcp`를 mount하지 않는다. 사용자가 명시적으로 `ssota-dev` project/task context를 조회하라고 할 때만 사용한다.
- 인증: Supabase OAuth 2.1 Server가 authorize/token/discovery/등록을 호스팅. `apps/mcp`는 Bearer JWT JWKS 검증 + `/.well-known/oauth-protected-resource` + `/api/mcp`를 유지한다.
- 도구 핸들러에 비즈니스 로직을 넣지 않는다 — task/project 포트 호출 + IO 변환만.

## Git 커밋 정책

**한 커밋 = 모듈·기능(태스크) 단위 하나.** 여러 화면·레이어·무관한 수정을 한 커밋에 묶지 않는다. 사용자가 “각 테스크마다 커밋”을 요청한 경우에도 이 절을 따른다.

### 모듈·기능별 커밋 분리 (에이전트 필수)

| 해야 할 것 | 하지 말 것 |
|---|---|
| Hub redirect, overview spec, E2E 등 **완료된 기능마다 커밋 1개** | gap 목록 전체를 한 커밋으로 제출 |
| `git add`로 **해당 태스크 파일만** 스테이징 | `git add .`로 다른 태스크 변경까지 포함 |
| 의존 순서가 있으면 **contracts → core → adapter → apps → e2e** 순으로 커밋 | 하위 레이어가 깨진 상태로 상위만 커밋 |
| 커밋마다 **해당 범위 최소 검증** 후 커밋 | “나중에 한꺼번에 테스트” |

**커밋 단위 예시**

- `packages/contracts` 시드·스키마 변경 1커밋
- `apps/web` page-runtime 컴포넌트 1커밋
- 특정 페이지 spec(`pages-tree.json` 한 슬라이스) 1커밋
- 해당 플로우 E2E 추가·수정 1커밋 (또는 바로 앞 기능 커밋과 묶을 수 없을 때만 별도)

**커밋 메시지**

- **[GIT-01]** 접두사: `[core|adapter|mcp|web|e2e|infra]` (변경 레이어·앱 기준)
- 본문: **왜/무엇** 한 줄 + 필요 시 불릿으로 태스크 요약

```
[web] initiative overview를 roadmap 스타일 SplitPane으로 정리

- tpl/initiative/overview spec 2열 구조
- fillHeight 루트 SplitPane 감지
```

**PR과의 관계**

- **`main` 직접 커밋 금지** — 커밋은 feature 브랜치에서만; `main` 반영은 PR 머지뿐 ([`main` 직접 커밋·푸시 금지](#main-직접-커밋푸시-금지-에이전트-필수)).
- **한 PR 안에 커밋 여러 개는 권장**한다 (기능별 히스토리·리뷰·revert 용이).
- **한 PR = 기능 슬라이스 하나**는 [기능별 PR 분리](#기능별-pr-분리-에이전트-필수)와 동일 — 커밋을 쪼갠다고 서로 다른 PR 범위를 한 브랜치에 섞어도 된다는 뜻이 아니다.

**예외 (한 커밋에 묶어도 되는 경우)**

- 동일 버그의 원인·수정·회귀 테스트 한 세트
- 한 파일에서 분리 불가능한 기계적 리네임·import 정리
- 사용자가 명시적으로 “한 커밋으로” 요청한 경우

MVP 마일스톤(M0–M6)의 “마일스톤당 1커밋”은 이 정책의 **레이어 단위 특례**다.

## PR Guidelines

- 제목: `[core|adapter|mcp|web|e2e|infra] 요약` — Console UI는 `[web] Console v2.7 PR N — …` 형식 권장.
- **[PR-01]** 머지 전 필수: `pnpm lint`, `pnpm typecheck`, `pnpm test` 그린.
- **[PR-02]** 도메인 불변식(Console v2.7 Graph Invariants)을 건드리는 변경은 PR 설명에 `## Invariant 사유` 섹션으로 근거를 명시한다 (해당 `[GRAPH-*]` 등 ID 나열).

### `main` 직접 커밋·푸시 금지 (에이전트 필수)

**[GIT-02] `main`에 직접 커밋하거나 푸시하지 않는다.** 모든 변경은 feature 브랜치 → GitHub PR → CI·리뷰 후 `main` 머지로만 반영한다. 로컬 `main`에 작업 커밋이 쌓이면 PR 없이 배포 경로에 들어간 것으로 오해하기 쉽다.

| 해야 할 것 | 하지 말 것 |
|---|---|
| `origin/main` 기준 `cursor/<기능-요약>` 브랜치 생성 후 그 브랜치에서만 커밋 | `main` 체크아웃 상태에서 기능 커밋 |
| `git push -u origin <branch>` 후 `gh pr create --base main` | `git push origin main` |
| PR 전 `git fetch origin && git rebase origin/main` (충돌 시 해결) | main에만 커밋하고 PR 생략 |
| 로컬 `main`은 `git pull origin main`으로 동기화만 | 에이전트가 main을 작업 브랜치로 사용 |

**에이전트 기본 절차**

1. `git fetch origin main && git checkout -b cursor/<요약> origin/main` (이미 브랜치가 있으면 그 브랜치 유지)
2. 구현·검증 후 **해당 브랜치에만** 커밋 (`git add`는 PR 범위 파일만)
3. `git push -u origin HEAD` → PR 생성 (`base: main`)
4. 머지된 뒤 다음 작업은 **업데이트된 `origin/main`에서** 새 브랜치 분기

브랜치 생성·커밋 직후 `SetActiveBranch`로 활성 브랜치 메타데이터를 맞춘다.

### 기능별 PR 분리 (에이전트 필수)

**한 PR = 구현 계획·Notion §7.2의 기능 슬라이스 하나.** 리뷰 가능한 크기로 쪼개고, 여러 PR 번호를 한 브랜치·한 draft에 몰아넣지 않는다.

| 해야 할 것 | 하지 말 것 |
|---|---|
| PR7 완료 → `main` 머지 → `main`에서 PR8 브랜치 | PR7+8+9를 한 커밋/한 PR로 제출 |
| 해당 PR 범위의 파일·E2E만 스테이징 | “나중에 쓸” 다음 PR 화면까지 미리 포함 |
| 선행 PR에서 공통 인프라 머지 후 다음 PR 시작 | 장기 feature 브랜치에 후속 PR을 계속 쌓기 |

**브랜치·머지 순서**

1. `main`에서 `cursor/<기능-요약>-f06d` 브랜치 생성.
2. 그 PR 범위만 구현·검증·푸시·**PR 하나** 생성.
3. `main`에 머지된 뒤에만 다음 PR 브랜치를 `main`에서 다시 분기.

**에이전트 작업 절차 (다중 PR 계획일 때)**

1. 계획의 PR 목록(예: 7 → 8 → 9)을 그대로 따른다.
2. **현재 턴에서는 활성 PR 하나만** — 커밋·푸시·GitHub PR도 그 하나만.
3. 다음 PR 코드가 필요해도 **같은 브랜치에 섞지 않는다**. 머지 후 새 세션/브랜치에서 이어간다.
4. PR 본문에 범위·비범위·통과한 E2E `--grep`을 명시한다.

**예외 (한 PR에 묶어도 되는 경우)**

- 동일 버그의 원인·수정·회귀 테스트 한 세트
- 사용자가 명시적으로 “한 PR로” 요청한 경우

이 정책은 MVP 마일스톤(M0–M6)의 “한 마일스톤 = 한 커밋 단위”·[Git 커밋 정책](#git-커밋-정책)의 모듈 분리와 같고, Console v2.7 UI는 **Notion PR 번호 단위**로 적용한다.

## Verification Tiers

편집 전에 변경의 **blast radius**(변경 표면 + 실패 파급 범위)로 티어를 정하고, 티어에 맞는 검증만 실행한다. 라인 수가 아니라 **어떤 표면을 건드렸는가**가 기준이다. 불확실하면 **한 티어 위로** 올린다 (Tier 4로 점프하지 않는다).

| 티어 | 변경 표면 | 실행 |
|---|---|---|
| **Tier 0** — 문서/지침 | AGENTS.md·CLAUDE.md·DESIGN.md·`packages/contracts/src/*/instructions/*.md`·주석·카피 | `pnpm harness:docs` |
| **Tier 1** — UI 컴포넌트 | `packages/ui`·`apps/web` 개별 컴포넌트의 표시 상태 (도메인 로직·스키마 불변) | `pnpm verify:quick` + `pnpm --filter <pkg> test` |
| **Tier 2** — page spec / L2 catalog / contracts | `pages-tree.json`·`ui-catalog`·`packages/contracts` 스키마·시드 | `pnpm verify:quick && pnpm --filter @ssota/contracts test` + 관련 e2e spec (`pnpm e2e -- --grep <키워드>`) |
| **Tier 3** — ports / adapter / schema / migrations | `packages/core` 포트·use-case, `packages/adapter-postgres`, `supabase/migrations/` | `pnpm verify:quick && pnpm test && pnpm e2e:ci` + 마이그레이션 up/down 확인 |
| **Tier 4** — 머지/최종 납품 | PR 머지 전, 의존성 변경, 광범위 리팩토링 | `pnpm verify:final` + [PR-03] 완료 증거 |

- Tier 0–2 편집마다 전체 e2e를 돌리지 않는다 (과잉 검증 금지).
- Tier 3+ 없이 `done` 선언하지 않는다 (과소 검증 금지).

## Harness

이 저장소의 규범은 산문이 아니라 **typed 계약**으로 관리된다.

- **계약 SSOT**: `packages/contracts/src/invariants/rules.ts` — 모든 `[AREA-NN]` 룰의 정의·레벨·강제 수단. 이 문서의 태그와 계약의 ID는 `pnpm harness:docs`가 동기화를 강제한다 (드리프트 = 모든 테스트 차단).
- **체크 명령**: `pnpm harness:docs`(문서 동기화) / `pnpm harness:boundaries`(우회 스캔) / `pnpm harness:env`(환경 프리플라이트) / `pnpm harness:mirrors`(스킬 미러 정합) / `pnpm harness`(전부).
- **allowlist 정책**: 룰 예외는 코드에 몰래 두지 않는다 — `scripts/harness/allowlists/*.json` 또는 `packages/config/eslint/allowlists.js`에 **경로 + 룰 ID + 사유**로 등록한다. 죽은 예외(존재하지 않는 경로)는 `harness:docs`가 실패시킨다.
- **에러 메시지 = 지시문**: 하네스 체크의 실패 출력은 "무엇이 왜 실패했고, 다음에 뭘 해야 하는지"를 담는다. 실패를 우회하지 말고 출력의 Next steps를 따른다.
- **dev-identity**: 여러 worktree에서 dev 서버를 띄우는 환경에서는, 브라우저·스크린샷 검증 전에 `node scripts/harness/check-dev-identity.mjs --url http://localhost:<port>`로 그 포트가 **내 worktree의 서버**인지 확인한다. 포트가 열려 있다는 것은 내 서버라는 뜻이 아니다.

## Additional Notes

- 이 저장소는 도그푸딩 대상이다: 노션 프로토타입(Documents·Instructions·Actions DB)을 SSOTA로 이전하는 것이 첫 마이그레이션 케이스(M6).
- 기획 변경은 코드가 아니라 Notion 문서(Draft → Human Gate 승인) 쪽에서 먼저 일어난다. 스펙과 코드가 충돌하면 Notion 코어 스펙이 우선이며, 코드 쪽 이슈로 제기한다.

## Cursor Cloud specific instructions

Cursor Cloud Agent는 **세션마다 새 VM 프로세스**에서 시작한다. git에 커밋된 코드·설정은 유지되지만, **Docker daemon, Supabase 컨테이너, DB 데이터, dev 서버, E2E 산출물**은 세션 간에 남지 않는다. 인프라가 필요한 작업(E2E, adapter 통합 테스트) 전에 **반드시** 아래 부트스트랩을 실행한다.

### 한 번에 준비 (권장)

```bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 24
pnpm cloud:prepare
```

`pnpm cloud:prepare` (= `scripts/cloud-bootstrap.sh`)가 하는 일:

1. Node 24 (`.nvmrc`) 확인 — nvm에 24가 없으면 update script(또는 `nvm install 24`)가 먼저 설치해야 한다
2. `node_modules` 없으면 `pnpm install`
3. **Build**: `pnpm build --filter web^...` — `apps/web`이 의존하는 워크스페이스 패키지(`@ssota/agent-runtime`, `@ssota/ee`, adapter 등) `dist/` 생성. `dist/`는 git·세션 간에 유지되지 않으므로 E2E·seed·통합 테스트 전에 **반드시** 빌드돼 있어야 한다
4. `apps/web/.env.local`, `apps/mcp/.env.local` 없으면 `.env.example` 복사
5. **Docker**: `docker`/`dockerd`가 없으면 `apt-get install -y docker.io`로 설치한 뒤, `iptables-legacy` + **`vfs` storage driver**로 `dockerd` 기동 (Cloud VM에서 기본 `iptables-nft`/`overlayfs`는 실패함)
6. **Supabase**: `pnpm exec supabase start` (CLI **2.105.0** pinned)
7. **DB**: `pnpm db:migrate` + `pnpm db:seed` (smoke 계정 포함)
8. **Secrets → .env.local**: `scripts/materialize-env-from-secrets.sh` (각 앱 `.env.example` manifest 기준)
9. **Playwright**: `pnpm --filter e2e exec playwright install chromium`

옵션: `--skip-install`, `--skip-playwright`

### 세션 간 유지 / 비유지

| 항목 | 새 Cloud 세션 |
|---|---|
| git 코드·PR | 유지 |
| `package.json` / lockfile / Supabase CLI pin | 유지 |
| Docker daemon·컨테이너·DB 볼륨 | **재생성 필요** (`pnpm cloud:prepare`) |
| `pnpm dev` tmux 세션 | **재기동 필요** |
| E2E 스크린샷·비디오 (`e2e/report/`) | **없음** — 실행 시 다시 생성 |

### Node.js

Cloud VM 기본 `node`(`/exec-daemon/node`)는 v22이다. 이 저장소는 **Node 24** (`.nvmrc`). 부트스트랩·검증 전에:

```bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 24
export PATH="$NVM_DIR/versions/node/v24.16.0/bin:$PATH"
```

### Docker & Supabase (수동 — 스크립트가 대신 실행)

`pnpm cloud:prepare`가 내부적으로 아래와 동일한 작업을 수행한다. 수동 디버깅 시 참고:

```bash
if ! command -v dockerd >/dev/null; then
  sudo apt-get update
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y docker.io
fi
sudo update-alternatives --set iptables /usr/sbin/iptables-legacy
sudo update-alternatives --set ip6tables /usr/sbin/ip6tables-legacy
sudo pkill dockerd || true
sudo pkill containerd || true
sudo mkdir -p /tmp/docker-vfs /tmp/docker-exec
sudo dockerd --storage-driver=vfs --data-root=/tmp/docker-vfs --exec-root=/tmp/docker-exec --host=unix:///var/run/docker.sock >/tmp/dockerd-vfs.log 2>&1 &
sudo chmod 666 /var/run/docker.sock
pnpm exec supabase start
pnpm db:migrate && pnpm db:seed
```

실패 시 로그: `/tmp/dockerd-vfs.log`. 흔한 원인: `dockerd: command not found`(Docker 패키지 미설치 — `docker.io` 설치 필요), `/var/run/docker.sock` 권한 `660 root docker`로 인한 `permission denied`(`sudo chmod 666 /var/run/docker.sock` 필요), `iptables-nft` NAT chain (`TABLE_ADD failed`), `overlayfs` whiteout (`operation not permitted`), Docker embedded DNS (`127.0.0.11` connection refused — legacy iptables 미적용).

**반복 방지 메모:** Cloud VM은 세션마다 Docker daemon뿐 아니라 Docker 패키지 자체가 없을 수 있다. `dockerd`가 없다고 E2E를 포기하지 말고 `pnpm cloud:prepare`가 `docker.io`를 설치하게 하거나 위 수동 명령으로 설치한 뒤 재시도한다. daemon 로그가 `API listen on /var/run/docker.sock`까지 갔는데 bootstrap이 실패하면 거의 항상 socket 권한 문제다.

`pnpm cloud:prepare`는 Supabase 기동 후 `scripts/sync-supabase-env.sh`로 `apps/web/.env.local`, `apps/mcp/.env.local`, 루트 `.env.local`에 `supabase status` 키(URL·anon·service_role·DATABASE_URL)를 동기화하고, 이어서 `scripts/materialize-env-from-secrets.sh`가 각 앱의 `.env.example` manifest에 선언된 키만 Cursor Secrets(`process.env`)에서 `.env.local`로 merge한다. 수동 갱신: `pnpm sync:env` (Supabase만), Secrets materialize는 `bash scripts/materialize-env-from-secrets.sh`.

### 앱 기동

표준 명령은 위 **Development Workflow** 참고. Cloud에서는 장시간 프로세스를 tmux로 띄운다:

```bash
tmux -f /exec-daemon/tmux.portal.conf new-session -d -s ssota-dev -c /workspace -- bash -l
# 세션에 nvm/Node 24 PATH 설정 후:
pnpm dev   # web :3000, mcp :3001
```

`pnpm e2e`는 Playwright가 **3100/3101**에서 자체 `next dev`를 띄우므로, `pnpm dev` tmux 세션이 살아 있으면 Next.js dev lock 충돌로 실패한다. e2e 전에 `tmux kill-session -t ssota-dev`로 dev 서버를 내린다.

### emulate (선택 — provider API 로컬)

[Vercel Labs emulate](https://github.com/vercel-labs/emulate)는 GitHub·Slack·Linear 등 **외부 SaaS HTTP API**를 로컬에서 상태ful하게 흉내 낸다. Supabase docker·SSOTA graph와 별개이며, **E2E 기본은 여전히 `CONNECT_STUB`/`MCP_STUB`**이다.

```bash
pnpm emulate:dev          # emulate.config.yaml seed로 GitHub/Slack/Linear/Google 기동
pnpm emulate:ports        # 기본 URL (4001/4003/4012 등) 출력
pnpm e2e:emulate          # emulate OAuth E2E (별도 Playwright config)
```

`EMULATE_ENABLED=1`일 때 agent-runtime enrichment가 emulate URL을 사용한다. agent-browser·Playwright UI 검증 워크플로는 그대로 유지한다.

### 검증 명령 (Cloud 세션)

| 목적 | 명령 | 사전 조건 |
|---|---|---|
| 부트스트랩 | `pnpm cloud:prepare` | Node 24 |
| 린트·타입 | `pnpm lint && pnpm typecheck` | 없음 |
| 코어 유닛 | `pnpm test --filter @ssota/core` | 없음 |
| 어댑터 통합 | `pnpm test --filter @ssota/adapter-postgres` | `cloud:prepare` |
| E2E + artifacts | `pnpm e2e:ci` | `cloud:prepare` |

스모크 계정: `smoke@ssota.ai` / `1234` (시드 생성).

> 어댑터 패키지는 `@ssota/adapter-postgres`다 (구 `@ssota/adapter-supabase` 명칭 아님). `--filter` 시 `adapter-postgres`를 쓴다.

### Vitest 경로 해석 — `apps/web`

`apps/web/vitest.config.ts`의 `resolve.alias`는 `apps/web/tsconfig.json`의 `paths`를 미러링한다 (shadcn 컨벤션: `@/lib/utils`·`@/components/ui/*`·`@/hooks/*`는 `packages/ui/src`로, `@/*`는 `apps/web`로). Vitest는 tsconfig paths를 읽지 않으므로, transitively 로드되는 `packages/ui` 소스의 `@/` self-import(`@/components/ui/…`)가 해석되려면 이 alias가 필요하다. **`packages/ui`의 `@/` 매핑을 바꾸면 이 vitest alias도 함께 갱신**한다 (drift 주의). alias는 most-specific-first 순서여야 한다.

> 과거 pre-existing 실패는 모두 수정됨: adapter `task-port`는 `beforeAll`에서 필요한 workflow instruction 시드(self-contained), smoke overview는 seeded 환경에서 안정적인 "Open Workflow Map" CTA assert, onboarding은 submit selector를 `getByRole(Continue)`로 범위 지정, cutover에서 제거된 `executive/goals` stale spec 삭제, `web#test` registry는 위 vitest alias로 해소.
