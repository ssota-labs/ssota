/**
 * 하네스 ESLint allowlist — 경계 룰의 예외 경로 SSOT.
 *
 * 규칙 (AGENTS.md "Harness" 절):
 *  - 예외는 코드의 eslint-disable이 아니라 여기에 [ID] 사유와 함께 등록한다.
 *  - 여기 등록한 경로는 packages/contracts/src/invariants/rules.ts의 해당 룰
 *    allowlist에도 있어야 한다 — invariants.test.ts가 부분집합 관계를 검증한다.
 *  - flat config의 files glob은 **config 파일 위치 기준**으로 매칭된다. 각 패키지가
 *    자기 디렉토리에서 lint를 돌리므로, 워크스페이스 프리픽스 없는 suffix glob
 *    (`**\/app/...`)을 사용해야 어디서 실행해도 매칭된다.
 */
export const HARNESS_ESLINT_ALLOWLISTS = {
  graphSchemaBoundary: [
    // [GRAPH-02] 하네스 도입 이전 베이스라인 — schema로 비그래프 테이블(agent run·schedule 등)에
    // 직접 접근 중. port 경유로 전환 대상. 신규 추가 금지. (원 경로: apps/web/…)
    "**/app/api/agent/cron/route.ts",
    "**/app/api/agent/dispatch/route.ts",
    "**/lib/console/resolve-org-page.ts",
    "**/lib/schedules/schedule-fan-out.ts",
  ],
  designSystemRules: [
    // [DS-03] 하네스 도입 이전 베이스라인 — Base UI render prop으로 전환 대상.
    // (원 경로: apps/web/components/…, packages/ui/src/components/…)
    "**/components/console/page-tree-nav.tsx",
    "**/components/ui/drawer.tsx",
  ],
};
