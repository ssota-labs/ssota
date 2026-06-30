# Cloud Agent 전용 지침

이 파일은 **Cursor Cloud Agent만** 읽는다. 로컬 IDE Agent는 무시한다.
`AGENTS.md`와 함께 적용되며, 충돌 시 **이 파일의 Cloud 제약이 우선**한다.

공통 도메인·아키텍처·검증 절차는 [AGENTS.md](../AGENTS.md)를 따른다.

---

## UI 검증 스택 (Cloud 포함)

프론트 작업은 [AGENTS.md — Frontend 작업 완료 정의](../AGENTS.md)의 4단계를 따른다.

| 순위 | 도구 | Cloud |
|------|------|-------|
| **1** | Playwright `pnpm e2e:ci` | ✅ 기능·회귀 SSOT. artifacts 자동 복사 |
| **2** | agent-browser | ✅ E2E 후 탐색·스크린샷·녹화 |
| **3** | Computer Use / RecordScreen | ✅ E2E 후 화면 조작·스크롤·데모 녹화 |

E2E를 건너뛰고 agent-browser/Computer Use만으로 “테스트 완료”로 표시하지 않는다.

---

## Playwright E2E

| 목적 | 명령 |
|------|------|
| 기능·회귀 | `pnpm e2e:ci` 또는 `pnpm e2e -- --grep '<키워드>'` |
| 산출물 | `/opt/cursor/artifacts/e2e/latest/` (스크립트가 자동 복사) |
| HTML 리포트 | `e2e/report/html/index.html` — 필요 시 `pnpm --filter e2e exec playwright show-report report/html` |

E2E 전에 `pnpm dev` tmux가 **3000/3101**을 쓰면 `tmux kill-session -t ssota-dev`로 내린다 (`pnpm e2e`는 3100/3101).

---

## agent-browser

- E2E **통과 후** 변경 플로우를 dev 서버(:3000)에서 다시 연다.
- 스크린샷·녹화를 `/opt/cursor/artifacts/screenshots/`, `videos/`에 저장.
- 스킬: `.agents/skills/agent-browser/SKILL.md`

```bash
pnpm dev --filter web   # tmux :3000
agent-browser set viewport 1440 900 2
agent-browser open http://localhost:3000/...
agent-browser screenshot --full /opt/cursor/artifacts/screenshots/<name>.png
```

---

## Computer Use

- `Task` + `subagent_type=computerUse`로 E2E 이후 **탐색적** UI 검증.
- 스크롤·사이드바·모달·멀티 스텝 플로우 등 Playwright assertion 밖 UX 확인.
- 움직이는 데모는 `RecordScreen` → `/opt/cursor/artifacts/`.
- E2E 실패 원인을 GUI 루프만으로 반복 디버깅하기보다, 먼저 Playwright 로그·artifacts를 본다.

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
| E2E + artifacts | `pnpm e2e:ci` | `cloud:prepare` |
| E2E (grep) | `pnpm e2e -- --grep '<키워드>'` | `cloud:prepare` |
