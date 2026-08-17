# Cloud Agent 전용 지침

이 파일은 **Cursor Cloud Agent만** 읽는다. 로컬 IDE Agent는 무시한다.
`AGENTS.md`와 함께 적용되며, 충돌 시 **이 파일의 Cloud 제약이 우선**한다.

공통 도메인·아키텍처·검증 절차는 [AGENTS.md](../AGENTS.md)를 따른다.

---

## UI 검증 스택 (Cloud 포함)

프론트 작업은 [AGENTS.md — Frontend 작업 완료 정의](../AGENTS.md)를 따른다.

| 순위 | 도구 | Cloud |
|------|------|-------|
| **1** | Playwright `pnpm e2e:changed` | ✅ 추가·수정된 스펙만. 전체는 `pnpm e2e:ci` / `verify:final` |
| **2** | agent-browser | 필요할 때만 |
| **3** | Computer Use / RecordScreen | 사용자가 데모를 요청한 경우만 |

E2E를 건너뛰고 agent-browser/Computer Use만으로 “테스트 완료”로 표시하지 않는다.

---

## Playwright E2E

| 목적 | 명령 |
|------|------|
| PR 전 | `pnpm e2e:changed` |
| 전체 스위트 | `pnpm e2e:ci` (`verify:final`) |
| HTML 리포트 | `e2e/report/html/index.html` |

로컬·Cloud 기본은 비디오·트레이스·스크린샷 **off**. `CI=1`일 때만 실패 시 남긴다.

E2E 전에 `pnpm dev` tmux가 **3000/3101**을 쓰면 `tmux kill-session -t ssota-dev`로 내린다 (Playwright는 3100/3101).

---

## agent-browser

- E2E가 못 덮는 탐색이 필요할 때만. 사용자가 데모를 요청하지 않으면 녹화하지 않는다.
- 스킬: `.agents/skills/agent-browser/SKILL.md`

```bash
pnpm dev --filter web   # tmux :3000
agent-browser set viewport 1440 900 2
agent-browser open http://localhost:3000/...
agent-browser screenshot --full /opt/cursor/artifacts/screenshots/<name>.png
```

---

## Computer Use

- `Task` + `subagent_type=computerUse`는 E2E assertion 밖 UX가 필요할 때만.
- 사용자가 데모를 요청한 경우에만 `RecordScreen` → `/opt/cursor/artifacts/`.
- E2E 실패는 Playwright 로그를 먼저 본다.

---

## Cloud VM 부트스트랩

세션마다 Docker·Supabase·`dist/`는 유지되지 않는다. E2E·adapter 통합·시드 전에:

```bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 24
pnpm cloud:prepare
```

장시간 dev 서버 (agent-browser / Computer Use용):

```bash
tmux -f /exec-daemon/tmux.portal.conf new-session -d -s ssota-dev -c /workspace -- bash -l
# nvm use 24 후:
pnpm dev --filter web   # :3000
```

상세: [AGENTS.md — Cursor Cloud specific instructions](../AGENTS.md).

Cloud 부팅 시 `pnpm cloud:prepare`가 `sync-supabase-env.sh` 후 `materialize-env-from-secrets.sh`를 실행해 Cursor Secrets를 `apps/web/.env.local`, `apps/mcp/.env.local`에 merge한다 (각 `.env.example` manifest 기준).

---

## 검증 명령 요약

| 목적 | 명령 | 사전 조건 |
|------|------|-----------|
| 부트스트랩 | `pnpm cloud:prepare` | Node 24 |
| 린트·타입 | `pnpm lint && pnpm typecheck` | — |
| E2E (변경 스펙) | `pnpm e2e:changed` | `cloud:prepare` |
| E2E (전체) | `pnpm e2e:ci` | `cloud:prepare` · `verify:final` |
