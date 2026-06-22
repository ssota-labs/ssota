# SSOTA Open-Core / Self-Hosting Plan

목표: SSOTA를 **단일 public 모노레포**로 유지하면서, 누구나 로컬/자체 환경에서 돌릴 수 있는
fair-code 코어 + 관리형 cloud로 나눈다. n8n과 동일한 라이선스 모델(Sustainable Use License +
Enterprise License)을 적용한다.

> **구현 상태 (P0–P5 완료).** 어댑터 선택은 env로 동작한다:
> `JOB_RUNNER=inline AUTH=local CREDENTIALS=own-app STUDIO_BUILD_STORAGE=local`.
> 셀프호스트 가이드는 [self-hosting.md](self-hosting.md). `.ee.` 파일은 런타임에서 dormant이며
> (OSS env면 실행 경로에 안 탐), 물리적으로 ee를 완전히 제거한 빌드는 별도 maintainer 작업으로 문서화.

> 핵심 통찰: SSOTA는 이미 adapter/port 패턴이라 "cloud 코드"의 대부분은 그냥 인프라 특정 어댑터다.
> 포크도, 두 번째 레포도 필요 없다. `JobRunner`/`AuthProvider` **어댑터 경계 = OSS/cloud 경계 =
> 라이선스 경계**가 그대로 일치한다.

---

## 1. 경계 (확정)

```
┌──────────────── 코어 (self-host, 단일 테넌트, Sustainable Use License) ────────────────┐
│ core / contracts / agent-runtime 로직                                                  │
│ adapter-postgres (아무 Postgres)                                                       │
│ InlineJobRunner       ← durability 없음, 그냥 await   (결정: inline으로 충분)          │
│ LocalAuthProvider     ← 단일유저 / Auth.js                                             │
│ OwnAppCredentialProvider ← 사용자가 커넥터별 OAuth 앱 직접 등록 (결정: 각자 등록)      │
│ Local/S3 storage                                                                       │
│ docker-compose 한 방으로 기동                                                          │
└────────────────────────────────────────────────────────────────────────────────────┘
┌──────────────── Enterprise / cloud (.ee. 파일, Enterprise License) ────────────────────┐
│ WorkflowJobRunner (Vercel WDK durable)  ·  SupabaseAuthProvider  ·  관리형 Connect 운영 │
│ billing  ·  멀티테넌시 오케스트레이션  ·  RBAC  ·  관리형 Sandbox  ·  스케일            │
└────────────────────────────────────────────────────────────────────────────────────┘
```

운영 차이지 기능 차이가 아니다. self-host도 모든 커넥터가 동작하고 agent도 돈다 — 단,
OAuth 앱을 직접 등록해야 하고 run이 crash하면 복구가 안 된다. cloud는 그 두 부담을 없앤다.

### "cloud 전용"의 3분류 (대부분은 비밀이 아니다)

| 종류 | 예시 | 비공개? | 라이선스 |
|---|---|---|---|
| 인프라 특정 어댑터 | WorkflowJobRunner(WDK), SupabaseAuthProvider, VercelConnect, Sandbox | ❌ | `.ee.` (소스는 공개) |
| 상업적 차별 기능 | billing, 멀티테넌시, RBAC | ❌ (공개해도 됨) | `.ee.` |
| 진짜 비밀 | secret, IaC, 배포 config, 고객 데이터 | ✅ 레포 밖 | env / 별도 private |

---

## 2. 라이선스 (n8n 모델 — fair-code)

n8n과 동일하게 **두 라이선스 + 파일명 규칙**으로 간다. OSI 오픈소스가 아니라 "fair-code"
(source-available, 상업적 재판매 제한)임을 README에 명시한다.

### 2.1 Sustainable Use License (코어 기본)
- 적용 범위: 파일명에 `.ee.`가 **없는** 모든 소스 (master 브랜치).
- 허용: 사용 / 수정 / 파생물 / 재배포.
- 제한: (a) 자신의 **내부 비즈니스 목적** 또는 비상업/개인 용도로만, (b) 재배포는 **무료·비상업**으로만,
  (c) 브랜딩 제거/변경 금지.
- 파일: 루트 `LICENSE.md` — n8n SUL 텍스트를 베이스로 회사명만 치환 (`SSOTA Sustainable Use License`).

### 2.2 Enterprise License (`.ee.` 파일)
- 적용 범위: 파일명에 `.ee.`가 들어간 모든 소스 (예: `runner.ee.ts`, `billing.ee.ts`).
- 사용하려면 유효한 SSOTA Enterprise License 보유 필요.
- 파일: 루트 `LICENSE_EE.md`.

### 2.3 규칙 운영
- 각 `.ee.ts` 파일 상단에 라이선스 헤더 주석 한 줄.
- 디렉토리로도 묶을 수 있음: `packages/<x>/src/ee/*.ee.ts` (파일명 규칙이 우선, 디렉토리는 가독성용).
- README에 "fair-code, not OSI open source" + 두 라이선스 링크 명시.
- ⚠️ 법무 검토 1회 필요 (라이선스 텍스트 차용·회사명·관할). 코드 작업과 병렬로.

> 참고: n8n은 `.ee.` **파일명**으로 가른다. 우리도 동일 규칙을 채택하면 빌드/CI에서
> glob 한 줄로 EE 코드를 식별·분리할 수 있어 가장 단순하다.

---

## 3. 타깃 아키텍처 — 어댑터 레지스트리 (포크 없이 한 앱이 두 모드)

이미 [`resolveCredentialProvider()`](../packages/agent-runtime/src/credentials/provider.ts)에서 쓰는 패턴을 전 어댑터로 확장한다.
`apps/web`은 env를 보고 어댑터를 고른다. 같은 코드, 같은 빌드, env만 다름.

```
# self-host (코어만)
JOB_RUNNER=inline      AUTH=local      CREDENTIALS=own-app   STORAGE=local|s3

# cloud (.ee. 어댑터 + EE 패키지 로드)
JOB_RUNNER=workflow    AUTH=supabase   CREDENTIALS=connect   STORAGE=supabase
```

`.ee.` 어댑터는 전부 **optional/lazy import** (지금 `@vercel/*`를 optionalDependencies로 둔 것과 동일).
`.ee.` 파일을 통째로 지워도 코어 빌드/부팅이 깨지지 않아야 한다 — 이게 단일 레포 open-core의 핵심 안전장치.

---

## 4. 패키지 재구성

| 현재 | 변경 | 라이선스 |
|---|---|---|
| `adapter-supabase` | → **`adapter-postgres`**로 개명. 순수 Postgres(drizzle) 부분만 남김 | SUL |
| (storage in adapter-supabase) | `StudioBuildStorage` 구현 분리: Local/S3는 SUL, `SupabaseStudioBuildStorage`는 `.ee.` | 혼합 |
| (신규) `adapter-local` | InlineJobRunner + LocalAuthProvider + OwnAppCredentialProvider + LocalStorage | SUL |
| (신규) `adapter-vercel` | `runner.ee.ts`(WDK) + `sandbox.ee.ts` + `connect.ee.ts` | EE |
| (신규) `adapter-supabase-auth` | `provider.ee.ts` (SupabaseAuthProvider) | EE |
| (신규) `packages/ee/*` | billing / multitenant / rbac (전부 `.ee.`) | EE |
| `core` | `JobRunner`, `AuthProvider` 포트 인터페이스 추가 | SUL |

`agent-runtime`의 기존 추상화(`CredentialProvider`, `SandboxSession`)는 그대로 둔다 — 이미 잘 됨.

---

## 5. 신규 포트 2개 (임계 경로)

### 5.1 `JobRunner` — workflow 결합 차단

```ts
// packages/core/src/ports/job-runner.ts  (SUL)
export interface JobRunner {
  enqueue<TArgs>(fn: AgentRunFn<TArgs>, args: TArgs): Promise<{ runId: string }>;
}
```

- `InlineJobRunner` (SUL, adapter-local): route에서 `await fn(args)` 또는 `after()`로 백그라운드 후
  runId 즉시 반환. durability 없음.
- `WorkflowJobRunner` (EE, `runner.ee.ts`): 현재 [ssota-agent.ts](../apps/web/app/workflows/ssota-agent.ts) 그대로 (`start()` + `"use workflow"`).
- 로직 공유: 현재 step 함수(`claimRunning`/`runAgentStep`/`finalizeRun`)는 **디렉티브만 떼면
  평범한 async**라 두 러너가 같은 코어 함수를 호출한다.
- 교체 지점 4곳: [run/route](../apps/web/app/api/agent/run/route.ts), [gate/route](../apps/web/app/api/agent/gate/route.ts),
  [chat/web/route](../apps/web/app/api/chat/web/route.ts), [bot.ts](../apps/web/lib/chat/bot.ts)의 `start(...)` → `jobRunner.enqueue(...)`.
- ⚠️ 스트리밍 주의: WDK의 `getWritable<UIMessageChunk>()`가 WDK 의존. InlineJobRunner는 일반
  `TransformStream`으로 대체하는 작은 어댑터 필요 (채팅 스트리밍 경로만 영향).
- `next.config`의 `withWorkflow`는 cloud 빌드에서만 적용되도록 env 분기.

### 5.2 `AuthProvider` — Supabase Auth 결합 차단

```ts
// packages/core/src/ports/auth-provider.ts  (SUL)
export interface AuthProvider {
  getCurrentUser(req: Request): Promise<{ id: string; email: string } | null>;
  middleware(req: Request): Promise<Response | undefined>;  // 쿠키 갱신 위임
  // + login / callback 라우트 핸들러
}
```

- `LocalAuthProvider` (SUL): 단일유저 dev 모드(env 고정) 또는 Auth.js credentials.
- `SupabaseAuthProvider` (EE, `provider.ee.ts`): 현재 `@supabase/ssr` 로직.
- 정리 대상: [proxy.ts](../apps/web/proxy.ts), [server.ts](../apps/web/lib/supabase/server.ts),
  [client.ts](../apps/web/lib/supabase/client.ts).
- user subject가 Connect 토큰 subject 해석에 엮인 부분([provider.ts](../packages/agent-runtime/src/credentials/provider.ts))도 같이 점검.

---

## 6. 단계별 로드맵

| P | 작업 | 노력 | 산출 |
|---|---|---|---|
| **P0** | 라이선스 도입: `LICENSE.md`(SUL) + `LICENSE_EE.md`(EE) + README fair-code 명시 + 법무 검토 착수 | 낮음 | 법적 경계 확정 |
| **P1** | `adapter-supabase` → `adapter-postgres` 개명, supabase-js를 storage/auth로만 격리 | 낮음(기계적) | 결합 명료화, 즉시 임의 Postgres 가능 |
| **P2** | `JobRunner` 포트 + `InlineJobRunner`. 4개 route를 포트 경유. WDK를 `runner.ee.ts`로 격리. 스트리밍 어댑터. | **높음** | **workflow 잠금 해제 (최대 임팩트)** |
| **P3** | `AuthProvider` 포트 + `LocalAuthProvider`. SupabaseAuth를 `provider.ee.ts`로. | 중간 | **self-host 마지막 잠금 해제** |
| **P4** | `OwnAppCredentialProvider` (커넥터별 OAuth 앱 등록) + S3/MinIO storage 구현 | 중간 | self-host 커넥터·스토리지 |
| **P5** | `docker-compose.yml` + `.env.example` + self-host 문서 + "ee 없이 부팅" CI job | 낮음 | DX / 출시 |

임계 경로: **P1 → P2 → P3**. P1은 워밍업, P2가 진짜 산.

---

## 7. CI / 안전장치

1. **`.ee.` 없이 부팅되는 CI job 추가** — `adapter-local`만으로 `pnpm build` + smoke 기동.
   OSS 경로가 깨지는 걸 자동 감지 (open-core 단일 레포의 핵심 안전장치).
2. **`.ee.` 빌드 스킵 가능** — 외부 기여자 PR이 EE 패키지 없이 통과해야 함.
3. **secret 0** — `.ee.` 코드가 공개돼도 secret은 env로만. 배포 config에 토큰 하드코딩 금지
   (지금 [turbo.json](../turbo.json)이 env 선언만 하는 패턴 유지).
4. **라이선스 헤더 린트** — `.ee.ts` 파일에 EE 헤더 주석 강제하는 간단한 체크.

---

## 8. DX (self-host 출시물)

- `docker-compose.yml`: `postgres + web + mcp` 한 방.
- `.env.example`: 코어 모드 기본값 (`JOB_RUNNER=inline AUTH=local ...`).
- `docs/self-hosting.md`: 5분 quickstart + 커넥터 OAuth 앱 등록 가이드.
- (선택) `ssota init` CLI: env 생성 + 마이그레이션 + seed 자동화.

---

## 부록: 현재 결합 실측 (2026-06 기준)

| 결합점 | 현 구현 | 상태 |
|---|---|---|
| DB | drizzle + `postgres` + `DATABASE_URL`, ports 패턴 | ✅ 이미 분리 |
| Storage | `StudioBuildStorage` 인터페이스 + Local/Supabase 구현 | ✅ 이미 분리 |
| Credentials/OAuth | `CredentialProvider` + env/connect + `CONNECT_STUB=1` | ✅ 이미 분리 |
| Sandbox | `SandboxSession` 인터페이스, optional import | ✅ 이미 분리 |
| Vercel 플랫폼 | analytics만 optional, blob/kv/cron 미사용 | ✅ 거의 없음 |
| **Auth** | `@supabase/ssr` 직접 박힘 (server/client/proxy) | ❌ → P3 |
| **Durable 실행** | `workflow`^4.5.0 직접 (`"use workflow"`, `start()` 4곳) | ❌ → P2 |
