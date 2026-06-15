# AGENTS.md

## Project Overview

SSOTA는 더 이상 범용 컨텍스트 그래프 런타임을 active product로 구현하지 않는다. Active product는 개발 에이전트를 찾는 일반 사용자와 개발자를 위한 **개발 워크플로우 작업 공간**이다.

Active DB/runtime keep set은 `profiles`, `organizations`, `organization_memberships`, `projects`, `tasks`, `nodes`, `edges`다. Node/edge type catalog는 DB 테이블이 아니라 `packages/contracts` 코드 SSOT다. 과거 generic graph/catalog/action/workflow runtime 코드는 `archive/generic-runtime/`에 reference-only로 보존하며, 배포 경로와 active Drizzle schema에서는 제외한다.

기획·스펙의 SSOT는 Notion의 SSOTA-on-SSOTA 개발 Playbook이다. 일반 코딩 작업은 MCP가 아니라 이 저장소의 개발 워크플로우 명령으로 수행한다.

### Stack

- TypeScript (최신), Zod, Drizzle ORM, Next.js 16, Tailwind, shadcn/ui
- Supabase: 로컬 docker(`supabase` CLI) + 리모트 배포 + branching, OAuth 2.1 Server(MCP 인증)
- Turborepo + pnpm workspaces, nvm(`.nvmrc`)
- 테스트: Vitest(unit·integration) + Playwright(e2e)

## Architecture — Hexagonal (불변)

```
apps/
  web/                  # Next.js 16 — 콘솔 UI (Human Gate·Action Log·카탈로그) + Supabase Auth + MCP OAuth consent
  mcp/                  # Next.js 16 — 독립 MCP 앱: /api/mcp + OAuth PRM 메타데이터 (Bearer JWT 검증)
packages/
  core/                 # 도메인 헥사곤 — 엔티티, 포트(인터페이스), executeAction 유스케이스, 4대 강제
  adapter-supabase/     # 드리븐 어댑터 — Drizzle 스키마·시드, core 포트 구현
  contracts/            # Zod 스키마 공유 — 액션 입력, MCP 도구 IO, log_payload
  config/               # tsconfig/eslint/vitest 공유 설정
supabase/               # supabase CLI 설정 (config.toml, migrations/)
e2e/                    # Playwright — 콘솔 + MCP HTTP 플로우
```

### 의존 방향 규칙 (위반 금지)

- `packages/core`는 IO 의존이 0이다. Drizzle, supabase-js, next 등을 **절대 import하지 않는다**. 포트 인터페이스만 정의한다.
- `packages/adapter-supabase`가 core의 포트를 구현한다. apps는 core 유스케이스를 호출하는 드라이빙 어댑터일 뿐 — 비즈니스 로직을 apps에 두지 않는다.
- 의존 방향: `apps/* → core ← adapter-supabase`. 역방향 import가 보이면 그것은 버그다.

## Domain Invariants — 협상 불가

이 저장소에서 코드를 쓸 때 아래 불변식을 깨는 변경은 어떤 이유로도 금지된다.

1. **쓰기는 `executeAction()` 하나로 수렴한다.** 노드/엣지 직접 CRUD 함수를 export하거나 MCP·UI에 노출하지 않는다. 모든 변경은 액션 컨트랙트를 통과한다.
2. **커밋과 로그는 단일 트랜잭션이다.** core의 `ActionCommitPort.commit({ effects, logEntry, gateDecision? })` 시그니처가 이를 타입 레벨에서 강제한다 — logEntry 없이 effects만 커밋하는 경로를 만들지 않는다. generic UnitOfWork로 트랜잭션 핸들을 core에 노출하지 않는다.
3. **4대 런타임 강제는 API 동작이다** (프롬프트 규범이 아니다): 카탈로그에 없는 타입 거부 / preconditions 미충족·effects 선언 밖 변경 거부 / executor=Human 계열은 Draft까지만, 승격은 사람의 승인 액션으로만 / 모든 커밋은 Action Log 자동 기록.
4. **게이트 승인도 액션이다.** `approve_gate` 역시 Action Log에 남는다. 전형 이탈(아키타입 typical values 위반)은 자동으로 gates 큐로 보낸다.
5. **노드 = 정형 봉투 + 비정형 content.** 런타임(게이트·권한·전이)이 참조하는 것만 필드로 구조화한다. 의미는 content(내장 text 또는 외부 링크)가 담당한다 — 결정 입력을 필드로 깎아내지 않는다.

## Tenancy & Security — `project_id` + 서버사이드 격리

SSOTA 플랫폼이 강제하는 격리 단위는 **`project_id` 하나**다. Supabase가 고객사 DB 스키마에 tenant 컬럼을 강제하지 않듯, SSOTA도 최종 고객(tenant) 구분을 플랫폼 헤더·런타임 검증으로 강제하지 않는다. B2B2C에서 Acme/Beta row 격리는 **고객사가 카탈로그·액션 계약에 정의한 property**(예: `subject_id`)와 **embedder BFF**가 담당한다.

```plain text
Organization (고객사 A)
├── Project: homepage-agent   → 카탈로그 + 그래프 (project_id)
└── Project: marketing-agent  → 카탈로그 + 그래프 (project_id)
    └── tenant 컬럼(예: subject_id)은 고객 카탈로그·BFF 책임 — 플랫폼 미강제
```

### 레이어 분리

| 레이어 | 담당 | 식별자 |
|---|---|---|
| 고객사 A 앱 (자체 Supabase) | 최종 사용자 인증·앱 데이터 RLS | A의 `users.id` (또는 동등한 PK) |
| SSOTA 그래프 DB | Project별 카탈로그·그래프 인스턴스 저장 | `project_id` (FK → `projects.id`) |
| SSOTA Console / MCP 서버 | 카탈로그·`executeAction`·쿼리 스코핑 | 요청 context의 `projectId` |

Console URL `[orgSlug]/[projectSlug]`와 MCP/API 헤더 `X-SSOTA-Project-Id`가 **project 격리의 SSOT**다. Embedder BFF는 org/project slug 또는 project UUID를 MCP에 전달한다.

### `project_id` 규칙

- **project-scoped** — Node/Edge/Action Catalog, Instruction, Property Catalog, `nodes`, `edges`, `action_log`, `gates`, `action_property_permissions` — 는 **`project_id` 필수**. adapter 포트는 `createActionPorts(db, { projectId })`로 생성하며 모든 쿼리·커밋을 project로 필터한다.
- **global** — `archetypes` 등 스키마 메타는 org/project와 무관하게 공유한다.
- **쓰기**: `executeAction` input에 `projectId`가 **필수**다. effect가 참조하는 기존 노드·엣지가 다른 project에 속하면 `PROJECT_MISMATCH`로 거부한다.
- **조회**: MCP/Console read API는 auth context의 `projectId`로 카탈로그·그래프·로그·게이트를 스코핑한다. 다른 project의 UUID를 header에 넣어도 해당 project 데이터만 반환한다(멤버십 검증은 Console auth 경로).

### Tenant property (고객 정의, 플랫폼 미강제)

- **카탈로그 책임** — `HomepageProject` 등 최종 고객별 row에 `subject_id`(또는 고객이 정한 이름)를 둘지는 **node type `propertySchema`·액션 계약**으로 정의한다. SSOTA는 해당 property를 자동 주입·검증·쿼리 필터하지 않는다.
- **BFF 패턴** — embedder가 auth 검증 후 `create_node` input의 `properties.subject_id`에 A의 `users.id`를 넣어 `execute_action`으로 전달한다 (`examples/embedder-bff/`).
- **조회** — `query_nodes`·`traverse_edges`는 `project_id`로만 스코핑한다. tenant별 필터가 필요하면 고객 액션·쿼리 설계 또는 BFF가 담당한다.
- **인덱스** — 고객이 tenant property를 쓰면 adapter 마이그레이션에서 `(project_id, node_type, (properties->>'subject_id'))` 등 **선택적** 복합 인덱스를 둘 수 있다.

예시 (홈페이지 제작 에이전트 — `homepage-agent` project):

```plain text
Project homepage-agent 카탈로그: HomepageProject, DesignBrief, PageSection
Acme 사용자 (A의 users.id = "usr_acme_42")
  → BFF: create_node { properties: { subject_id: "usr_acme_42", title: "..." } }
query_nodes({ nodeType: "HomepageProject" }) + context.projectId → project 내 전체 row
  (Acme만 보려면 BFF/앱이 properties 필터 또는 별도 액션으로 처리)
```

별도 Project `marketing-agent`는 **독립 카탈로그·그래프** — homepage project의 node type/action catalog와 섞이지 않는다.

### Postgres RLS — 전 테이블 deny-all (의도적)

SSOTA 그래프 테이블(`nodes`, `edges`, `action_log`, 카탈로그, org/project 등) **전부 RLS를 켠다**. 각 테이블에 `deny_all` 정책(`USING (false)`, `WITH CHECK (false)`)을 둬 **anon/authenticated PostgREST 접근을 차단**한다.

1. **격리의 SSOT는 `executeAction` + 서버 `projectId` context**다. Property Permission 튜플은 액션 계약 강제(4대 강제 중 계약·권한)이지, Postgres row policy가 아니다.
2. **서버만 DB 접근**: adapter는 `createDb` / `createAdminDb`로 `DATABASE_URL`(postgres superuser 또는 service role 직접 연결)만 사용한다. 이 경로는 RLS를 bypass한다.
3. **고객사 A의 최종 사용자 RLS**는 A의 자체 Supabase에서 처리한다. SSOTA 그래프 DB는 A의 백엔드·SSOTA 서버만 접근하는 **서버사이드 데이터 플레인**이다.

### Defense in depth (서버사이드)

```
[최종 사용자] → [고객사 A API — A의 Supabase Auth + A의 RLS]
                      ↓ (선택) tenant property in action input
              [SSOTA apps/web | apps/mcp — JWT·projectId 검증]
                      ↓
              [executeAction / queryNodes — core 4대 강제 + project 스코핑]
                      ↓
              [adapter-supabase — createAdminDb / DATABASE_URL, RLS bypass]
```

- **금지**: anon/authenticated PostgREST로 `nodes`/`edges` 직접 노출, permissive RLS policy 추가, 플랫폼 레벨 tenant 헤더(`X-SSOTA-Subject-Id`)로 런타임 강제.
- **필수**: 모든 graph read/write는 apps 라우트·MCP 핸들러를 통과; RLS 거부 케이스 integration 테스트.

SSOTA Console 운영자(카탈로그 편집·Human Gate)는 org membership auth로 project 전체 데이터에 접근한다.

**Embedder BFF 예시**: `examples/embedder-bff/` — 고객사 A가 `X-Embedder-User-Id`(자체 `users.id`)를 검증 후 `properties.subject_id`를 넣어 SSOTA API로 프록시. 로컬 실행: `pnpm embedder-bff` (MCP 기동 후).

## Setup Commands

```bash
nvm use                      # .nvmrc 기준 Node 버전
pnpm install                 # 전체 워크스페이스 의존성
supabase start               # 로컬 Supabase docker 기동
pnpm db:migrate              # Supabase 마이그레이션 적용 (supabase migration up --local)
pnpm db:seed                 # 아키타입 2계열 + 코어 카탈로그 + smoke 계정 시드
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

`apps/web`·`packages/ui` 등 **사용자에게 보이는 UI를 바꾸는 작업**은 코드 커밋만으로 끝나지 않는다. 아래 3단계를 모두 마쳐야 **완료**다. 사용자가 스크린샷·데모를 따로 요청하지 않아도 에이전트가 끝까지 수행한다.

```
1. 구현 + 정적 검증
2. E2E (해당 플로우)
3. agent-browser로 시각 보고
```

### 1. 구현 + 정적 검증

- `pnpm lint && pnpm typecheck` (변경 범위에 맞게)
- `apps/web`만 건드렸으면 `pnpm --filter web typecheck`
- 디자인 규칙: [DESIGN.md](DESIGN.md), `@ssota/ui` semantic tokens

### 2. E2E

- 변경한 화면·플로우에 맞는 Playwright 스펙을 실행한다. 신규 UX면 **테스트 추가**를 우선 검토한다.
- 실행 전: Cloud는 `pnpm cloud:prepare`, 로컬은 `pnpm e2e:prepare` 또는 `supabase start` + migrate + seed.
- `pnpm e2e`는 **3100/3101**에서 자체 `next dev`를 띄운다. `pnpm dev` tmux 세션이 3000/3001을 쓰면 E2E 전에 `tmux kill-session -t ssota-dev`로 내린다.
- 관련 테스트만 돌릴 때: `pnpm e2e --grep '<키워드>'` (예: `--grep onboarding`).
- 실패 시 수정 후 재실행. E2E 산출물·리포트 규칙은 아래 **E2E 리포트** 절을 따른다.

### 3. agent-browser 시각 보고

E2E가 통과한 뒤, **실제 브라우저에서 변경 UI를 다시 열어** 사용자에게 보여준다. Playwright 산출물만으로 끝내지 않는다.

- 스킬: `.agents/skills/agent-browser/SKILL.md` — 실행 전 `agent-browser skills get core`로 워크플로 확인.
- 설치: `npm i -g agent-browser && agent-browser install` (Cloud 세션에 없으면 설치).
- dev 서버: `pnpm dev --filter web` (:3000). E2E 직후라면 tmux로 다시 기동.
- **데스크탑 뷰포트**가 기본: `agent-browser set viewport 1440 900 2` (2x retina).
- 변경된 화면·상태별로 스크린샷: `agent-browser screenshot --full /opt/cursor/artifacts/screenshots/<이름>.png`
- 여러 단계(온보딩 1→2, 모달 열림 등)면 **상태마다 1장 이상** 캡처.
- 플로우가 움직이는 경우 짧은 데모가 필요하면 `RecordScreen` 또는 agent-browser로 단계별 캡처.

**사용자 응답·PR 본문에 포함할 것**

- `/opt/cursor/artifacts/screenshots/` 등에 저장한 **스크린샷 2–4장** (markdown `<img>` 태그, 절대 경로).
- 무엇을 바꿨는지 한 줄 요약 + 캡처가 보여주는 상태 설명.
- E2E를 돌렸다면 통과한 스펙 이름(또는 `--grep` 키워드).
- 실패했던 경우: 수정 내용과 재실행 결과.

**agent-browser 최소 예시**

```bash
agent-browser set viewport 1440 900 2
agent-browser open http://localhost:3000/onboarding/profile
agent-browser wait --load networkidle
agent-browser screenshot --full /opt/cursor/artifacts/screenshots/onboarding-step1.png
# 플로우 진행 후 다음 상태도 동일하게 캡처
agent-browser close
```

### 완료 체크리스트 (프론트 PR)

- [ ] UI 구현 및 lint/typecheck 통과
- [ ] 해당 플로우 E2E 통과 (필요 시 스펙 추가)
- [ ] agent-browser 데스크탑 스크린샷으로 사용자/PR에 시각 보고
- [ ] 커밋·푸시·PR 업데이트 (테스트 전·후 변경 반영)

## MVP 마일스톤 커밋 (에이전트·개발자 공통)

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
- plan 파일의 todo 상태만 유지하고, **커밋 정책 SSOT는 AGENTS.md(이 섹션)** 이다.

## Testing Instructions

테스트는 3층이며, 층마다 인증 방식이 다르다.

| 층 | 명령 | 인증 | 대상 |
|---|---|---|---|
| Unit | `pnpm test --filter core` | 없음 (in-memory 포트) | 4대 강제의 통과/거부 케이스 전수 |
| Integration | `pnpm test --filter adapter-supabase` | **smoke 계정** | 트랜잭션 원자성(실패 시 로그도 롤백), permission 튜플 매칭, 시드 무결성 |
| E2E | `pnpm e2e` | **smoke 계정** | 콘솔(로그인→게이트 승인→로그) + MCP HTTP(Bearer→initialize→execute_action→거부 케이스) |

- **Smoke 계정**: `smoke@ssota.test` — 시드 단계에서 Auth Admin API로 생성되는 전용 테스트 사용자. integration·e2e는 반드시 이 계정으로만 인증한다. 실제 사용자 계정이나 service key 우회로 테스트하지 않는다.
- Integration·e2e 실행 전 `supabase start`가 떠 있어야 한다. **로컬**에서는 `pnpm e2e:prepare` (= supabase start + migrate + seed). **Cursor Cloud**에서는 세션마다 `pnpm cloud:prepare`로 Docker·Supabase·시드를 한 번에 부트스트랩한다 (`scripts/cloud-bootstrap.sh`). `pnpm e2e` global setup은 smoke 로그인 실패 시 migrate+seed만 자동 재시도한다 (`e2e/global-setup.ts`) — Cloud에서 Docker가 안 떠 있으면 `cloud:prepare`가 필요하다.
- E2E 로그인은 `e2e/helpers/auth.ts`의 `loginAsSmoke()`를 사용한다 — 헤더의「로그인」링크와 폼 submit 버튼 이름이 같아 `getByRole('button', { name: '로그인' })` 단독 사용 시 strict mode violation이 난다.
- 새 강제 규칙·포트를 추가하면 **거부 케이스 테스트가 필수다.** 통과 케이스만 있는 PR은 불완전하다.
- "비기록 변경 0건"(Phase 1 exit criteria)은 integration에서 구조적으로 검증한다: 로그 없이 커밋되는 경로가 존재하지 않음.

### E2E 리포트 (에이전트·PR 공통)

E2E를 실행한 턴(특히 web/studio/e2e 변경 PR)에서는 **스크린샷·비디오·HTML 리포트**를 사용자에게 제공한다. 매번 요청받지 않아도 된다.

**실행**

```bash
# dev 서버 tmux 세션이 3000/3001을 쓰면 e2e 전에 종료 (Playwright는 3100/3101 사용)
cd e2e && pnpm exec playwright install chromium   # 최초 1회
pnpm e2e                                          # 또는 pnpm e2e:report (HTML 뷰어)
```

**산출물 경로** (`e2e/playwright.config.ts` 기준)

| 종류 | 경로 |
|---|---|
| HTML 리포트 | `e2e/report/html/index.html` |
| 스크린샷 | `e2e/report/test-results/**/` |
| 비디오 | `e2e/report/test-results/**/*.webm` |
| trace | `e2e/report/test-results/**/trace.zip` |
| JSON 요약 | `e2e/report/results.json` |

**에이전트 응답 규칙**

- E2E 실행 후 PR/작업 요약에 **주요 스크린샷 2–4장**과 **대표 플로우 비디오 1개**를 첨부한다 (`/opt/cursor/artifacts/`에 복사 후 markdown 이미지/비디오 태그로 참조).
- 실패 시 HTML 리포트 경로와 실패 테스트명·스크린샷을 함께 남긴다.
- `e2e/report/`는 `.gitignore` 대상 — 커밋하지 않는다.

## Code Style

- TypeScript strict 모드. `any` 금지, 외부 입력은 Zod(`packages/contracts`)로 파싱.
- Zod 스키마는 `packages/contracts`에 정의하고 core/apps가 공유한다 — 스키마를 앱에 중복 정의하지 않는다.
- 도메인 용어는 코어 스펙의 명칭을 그대로 쓴다: `executeAction`, `ActionCommitPort`, `gate`, `archetype`, `lifecycle_status` 등. 임의로 동의어를 만들지 않는다.
- 파일 코멘트·문서는 한국어, 식별자는 영어.
- UI는 `@ssota/ui` (`packages/ui`) shadcn Base UI 컴포넌트 우선. `pnpm dlx shadcn@latest add <component> -y -c apps/web`로 추가. 디자인 규칙은 루트 [DESIGN.md](DESIGN.md) 및 `.cursor/rules/design.mdc` 참조.

## MCP App Notes (apps/mcp)

- 엔드포인트는 `/api/mcp` (Streamable HTTP, `mcp-handler` + `@modelcontextprotocol/sdk`).
- Active MCP scope는 account/project discovery와 development workflow `tasks` 조회다. Generic graph/catalog/action/workflow tools는 archived runtime으로 이동했으며 active agent protocol이 아니다.
- 일반 구현 작업에서 `ssota-mcp`를 mount하지 않는다. 사용자가 명시적으로 `ssota-dev` project/task context를 조회하라고 할 때만 사용한다.
- 인증: Supabase OAuth 2.1 Server가 authorize/token/discovery/등록을 호스팅. `apps/mcp`는 Bearer JWT JWKS 검증 + `/.well-known/oauth-protected-resource` + `/api/mcp`를 유지한다.
- 도구 핸들러에 비즈니스 로직을 넣지 않는다 — task/project 포트 호출 + IO 변환만.

## PR Guidelines

- 제목: `[core|adapter|mcp|web|e2e|infra] 요약`
- 머지 전 필수: `pnpm lint`, `pnpm typecheck`, `pnpm test` 그린.
- 도메인 불변식(위 5개)을 건드리는 변경은 PR 설명에 근거를 명시하고 코어 스펙 문서와의 정합성을 확인한다.

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
3. **Build**: `pnpm build --filter @ssota/adapter-supabase --filter @ssota/client` — 워크스페이스 라이브러리(contracts/core/adapter/client) `dist/` 생성. `dist/`는 git·세션 간에 유지되지 않으므로 seed·통합 테스트·앱이 `@ssota/core/dist`를 import하기 전에 **반드시** 빌드돼 있어야 한다 (`pnpm dev`는 tsc watch로 자체 빌드하지만 standalone seed/test는 아니다)
4. `apps/web/.env.local`, `apps/mcp/.env.local` 없으면 `.env.example` 복사
5. **Docker**: `docker`/`dockerd`가 없으면 `apt-get install -y docker.io`로 설치한 뒤, `iptables-legacy` + **`vfs` storage driver**로 `dockerd` 기동 (Cloud VM에서 기본 `iptables-nft`/`overlayfs`는 실패함)
6. **Supabase**: `pnpm exec supabase start` (CLI **2.105.0** pinned)
7. **DB**: `pnpm db:migrate` + `pnpm db:seed` (smoke 계정 포함)
8. **Playwright**: `pnpm --filter e2e exec playwright install chromium`

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

`pnpm cloud:prepare`는 Supabase 기동 후 `scripts/sync-supabase-env.sh`로 `apps/web/.env.local`, `apps/mcp/.env.local`, 루트 `.env.local`에 `supabase status` 키(URL·anon·service_role·DATABASE_URL)를 동기화한다. 수동 갱신: `pnpm sync:env`.

### 앱 기동

표준 명령은 위 **Development Workflow** 참고. Cloud에서는 장시간 프로세스를 tmux로 띄운다:

```bash
tmux -f /exec-daemon/tmux.portal.conf new-session -d -s ssota-dev -c /workspace -- bash -l
# 세션에 nvm/Node 24 PATH 설정 후:
pnpm dev   # web :3000, mcp :3001
```

`pnpm e2e`는 Playwright가 **3100/3101**에서 자체 `next dev`를 띄우므로, `pnpm dev` tmux 세션이 살아 있으면 Next.js dev lock 충돌로 실패한다. e2e 전에 `tmux kill-session -t ssota-dev`로 dev 서버를 내린다.

### 검증 명령 (Cloud 세션)

| 목적 | 명령 | 사전 조건 |
|---|---|---|
| 부트스트랩 | `pnpm cloud:prepare` | Node 24 |
| 린트·타입 | `pnpm lint && pnpm typecheck` | 없음 |
| 코어 유닛 | `pnpm test --filter @ssota/core` | 없음 |
| 어댑터 통합 | `pnpm test --filter @ssota/adapter-supabase` | `cloud:prepare` |
| E2E | `pnpm e2e` | `cloud:prepare` |

스모크 계정: `smoke@ssota.test` / `smoke-test-password-123` (시드 생성).
