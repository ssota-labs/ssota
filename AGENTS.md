# AGENTS.md

## Project Overview

LoopOS — 에이전트에게 결정을 위임하기 위한 컨텍스트 그래프 런타임. "결정 공간 하네스의 Supabase"가 포지셔닝이다. 8개 프리미티브(Node, Node Catalog, Edge, Edge Catalog, Action, Action Catalog, Property Catalog, Instruction)를 저장하고, 4대 런타임 강제(카탈로그·계약·게이트·감사)를 API 동작으로 보장하며, MCP로 에이전트에게 마운트된다.

기획·스펙의 SSOT는 Notion에 있다 (LoopOS 기획 시리즈 1–5, 특히 "LoopOS 코어 스펙 — 프리미티브·런타임 강제·MCP"). 구현 계획은 Cursor plan `loopos_mvp_구현_c63c2b4a.plan.md`를 따른다.

### Stack

- TypeScript (최신), Zod, Drizzle ORM, Next.js 16, Tailwind, shadcn/ui
- Supabase: 로컬 docker(`supabase` CLI) + 리모트 배포 + branching, OAuth 2.1 Server(MCP 인증)
- Turborepo + pnpm workspaces, nvm(`.nvmrc`)
- 테스트: Vitest(unit·integration) + Playwright(e2e)

## Architecture — Hexagonal (불변)

```
apps/
  web/                  # Next.js 16 — 콘솔 UI (Human Gate 큐·Action Log·카탈로그 브라우저) + Supabase Auth
  mcp/                  # Next.js 16 — 독립 MCP 앱: /api/mcp 라우트 + /oauth/consent 화면
packages/
  core/                 # 도메인 헥사곤 — 엔티티, 포트(인터페이스), executeAction 유스케이스, 4대 강제
  adapter-supabase/     # 드리븐 어댑터 — Drizzle 스키마·마이그레이션·시드, core 포트 구현
  contracts/            # Zod 스키마 공유 — 액션 입력, MCP 도구 IO, log_payload
  config/               # tsconfig/eslint/vitest 공유 설정
supabase/               # supabase CLI 설정 (config.toml: [auth.oauth_server] enabled)
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

## Setup Commands

```bash
nvm use                      # .nvmrc 기준 Node 버전
pnpm install                 # 전체 워크스페이스 의존성
supabase start               # 로컬 Supabase docker 기동
pnpm db:migrate              # Drizzle 마이그레이션 적용
pnpm db:seed                 # 아키타입 2계열 + 코어 카탈로그 + smoke 계정 시드
```

- 환경변수는 각 앱의 `.env.example`을 복사해 `.env.local` 작성. 시크릿은 절대 커밋하지 않는다.
- Supabase OAuth 2.1 Server는 `supabase/config.toml`의 `[auth.oauth_server] enabled = true`, `allow_dynamic_registration = true`로 설정한다.

## Development Workflow

```bash
pnpm dev                     # turbo run dev — web + mcp 동시 기동
pnpm dev --filter web        # 콘솔만
pnpm dev --filter mcp        # MCP 앱만
pnpm build                   # turbo run build (전체)
pnpm lint && pnpm typecheck  # 린트 + 타입 체크
```

- 패키지 추가는 `pnpm add <pkg> --filter <workspace>` 사용.
- 스키마 변경 시: `packages/adapter-supabase`에서 Drizzle 스키마 수정 → `pnpm db:generate`로 마이그레이션 생성 → `pnpm db:migrate`.

## Testing Instructions

테스트는 3층이며, 층마다 인증 방식이 다르다.

| 층 | 명령 | 인증 | 대상 |
|---|---|---|---|
| Unit | `pnpm test --filter core` | 없음 (in-memory 포트) | 4대 강제의 통과/거부 케이스 전수 |
| Integration | `pnpm test --filter adapter-supabase` | **smoke 계정** | 트랜잭션 원자성(실패 시 로그도 롤백), permission 튜플 매칭, 시드 무결성 |
| E2E | `pnpm e2e` | **smoke 계정** | 콘솔(로그인→게이트 승인→로그) + MCP HTTP(Bearer→initialize→execute_action→거부 케이스) |

- **Smoke 계정**: `smoke@loopos.test` — 시드 단계에서 Auth Admin API로 생성되는 전용 테스트 사용자. integration·e2e는 반드시 이 계정으로만 인증한다. 실제 사용자 계정이나 service key 우회로 테스트하지 않는다.
- Integration·e2e 실행 전 `supabase start`가 떠 있어야 한다.
- 새 강제 규칙·포트를 추가하면 **거부 케이스 테스트가 필수다.** 통과 케이스만 있는 PR은 불완전하다.
- "비기록 변경 0건"(Phase 1 exit criteria)은 integration에서 구조적으로 검증한다: 로그 없이 커밋되는 경로가 존재하지 않음.

## Code Style

- TypeScript strict 모드. `any` 금지, 외부 입력은 Zod(`packages/contracts`)로 파싱.
- Zod 스키마는 `packages/contracts`에 정의하고 core/apps가 공유한다 — 스키마를 앱에 중복 정의하지 않는다.
- 도메인 용어는 코어 스펙의 명칭을 그대로 쓴다: `executeAction`, `ActionCommitPort`, `gate`, `archetype`, `lifecycle_status` 등. 임의로 동의어를 만들지 않는다.
- 파일 코멘트·문서는 한국어, 식별자는 영어.
- UI는 shadcn/ui 컴포넌트 우선. `pnpm dlx shadcn@latest add <component>`로 추가.

## MCP App Notes (apps/mcp)

- 엔드포인트는 `/api/mcp` (Streamable HTTP, `mcp-handler` + `@modelcontextprotocol/sdk`).
- 도구 6군: 카탈로그 조회(`list_node_types`, `get_action_contract`) / 상태 조회(`query_nodes`, `traverse_edges`) / 지침 검색(`find_instruction`) / **`execute_action`(유일한 쓰기)** / 게이트 큐(`list_pending_gates`, `submit_for_approval`) / 로그(`get_action_log`).
- 인증: Supabase OAuth 2.1 Server가 authorize/token/discovery/등록을 호스팅. 이 앱은 (1) `/oauth/consent` 화면(`supabase.auth.oauth.getAuthorizationDetails/approveAuthorization/denyAuthorization`)과 (2) Bearer JWT의 JWKS 검증 + `.well-known/oauth-protected-resource` 메타데이터만 구현한다.
- 도구 핸들러에 비즈니스 로직을 넣지 않는다 — core 유스케이스 호출 + IO 변환만.

## PR Guidelines

- 제목: `[core|adapter|mcp|web|e2e|infra] 요약`
- 머지 전 필수: `pnpm lint`, `pnpm typecheck`, `pnpm test` 그린.
- 도메인 불변식(위 5개)을 건드리는 변경은 PR 설명에 근거를 명시하고 코어 스펙 문서와의 정합성을 확인한다.

## Additional Notes

- 이 저장소는 도그푸딩 대상이다: 노션 프로토타입(Documents·Instructions·Actions DB)을 LoopOS로 이전하는 것이 첫 마이그레이션 케이스(M6).
- 기획 변경은 코드가 아니라 Notion 문서(Draft → Human Gate 승인) 쪽에서 먼저 일어난다. 스펙과 코드가 충돌하면 Notion 코어 스펙이 우선이며, 코드 쪽 이슈로 제기한다.
