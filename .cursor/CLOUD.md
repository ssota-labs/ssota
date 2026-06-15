# Cloud Agent 전용 지침

이 파일은 **Cursor Cloud Agent만** 읽는다. 로컬 IDE Agent는 무시한다.
`AGENTS.md`와 함께 적용되며, 충돌 시 **이 파일의 Cloud 제약이 우선**한다.

공통 도메인·아키텍처·검증 절차는 [AGENTS.md](../AGENTS.md)를 따른다.

---

## Computer Use 금지 (필수)

Cloud Agent VM의 **Computer Use**(원격 데스크탑·마우스·키보드·GUI 브라우저 자동화)는 **사용하지 않는다**.

다음을 하지 않는다:

- 원격 데스크탑 제어·클릭·스크롤·입력으로 UI 검증
- Computer Use 서브에이전트로 브라우저 탐색·폼 채우기·반복 GUI 테스트
- `RecordScreen`으로 데모 영상 녹화
- GUI 루프로 버그를 “보면서” 디버깅 (스크린샷 → 수정 → 다시 스크린샷 반복)

이유: Computer Use는 액션마다 스크린샷이 모델로 들어가 **Max Mode 토큰 비용이 급증**한다. Enterprise에서만 대시보드로 끌 수 있으므로, 이 저장소는 **지시로 금지**한다.

---

## 허용되는 검증 (대체)

| 목적 | 방법 |
|------|------|
| 기능·회귀 검증 | `pnpm e2e` 또는 `pnpm e2e --grep '<키워드>'` |
| 유닛·통합 | `pnpm test --filter @ssota/core`, `pnpm test --filter @ssota/adapter-supabase` |
| 정적 검증 | `pnpm lint && pnpm typecheck` |
| 프론트 시각 보고 (완료 후 1회) | **agent-browser**로 스크린샷 **2~4장만** (아래 절) |

E2E 전에 `pnpm dev` tmux 세션이 **3000/3101**을 쓰고 있으면 `tmux kill-session -t ssota-dev`로 내린 뒤 E2E를 실행한다 (`pnpm e2e`는 3100/3101 사용).

---

## agent-browser (제한적 허용)

`AGENTS.md`의 프론트 완료 정의 3단계를 따르되, **Computer Use와 구분**한다.

- **허용**: E2E 통과 **후** `agent-browser open` → `screenshot` → 파일 저장 → PR/요약에 첨부
- **금지**: agent-browser로 클릭·폼 입력 루프를 돌며 GUI 테스트 (그건 Computer Use/E2E 영역)
- 스크린샷은 변경된 **핵심 상태 2~4장**으로 제한. 픽셀 단위 반복 분석 금지
- 저장 경로: `/opt/cursor/artifacts/screenshots/<이름>.png`
- 뷰포트: `agent-browser set viewport 1440 900 2`

스킬: `.agents/skills/agent-browser/SKILL.md` — 실행 전 `agent-browser skills get core`.

---

## Cloud VM 부트스트랩

세션마다 Docker·Supabase·`dist/`는 유지되지 않는다. E2E·adapter 통합·시드 전에:

```bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 24
pnpm cloud:prepare
```

장시간 dev 서버는 tmux:

```bash
tmux -f /exec-daemon/tmux.portal.conf new-session -d -s ssota-dev -c /workspace -- bash -l
# nvm use 24 후:
pnpm dev --filter web   # :3000 (agent-browser용, E2E와 동시에 쓰지 않음)
```

상세: [AGENTS.md — Cursor Cloud specific instructions](../AGENTS.md).

---

## 비용·모델

- Cloud Agent는 **Max Mode 고정**. Computer Use를 쓰지 않는 것이 가장 큰 절감이다.
- 모델은 가능하면 **Composer 2.5 (Standard)**. Fast·Opus·high thinking은 명시 요청이 없으면 쓰지 않는다.
- 작업은 **작게 쪼개고**, 탐색은 로컬 Plan에 맡기고 Cloud에는 **구현·E2E·최종 스크린샷**만 맡긴다.

---

## Cloud Agent 프롬프트에 넣을 한 줄 (참고)

작업 지시에 아래를 포함해도 된다:

```
Computer Use / 원격 GUI / RecordScreen 금지. 검증은 pnpm e2e·shell만. agent-browser는 E2E 후 스크린샷 2~4장.
```
