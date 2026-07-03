/**
 * 하네스 계약 SSOT — 이 저장소의 모든 규범 룰을 typed data로 선언한다.
 *
 * 3방향 동기화 (드리프트 = 테스트·하네스 실패):
 *   1) 이 배열의 id  ↔  AGENTS.md/CLAUDE.md/DESIGN.md의 [ID] 태그  (scripts/harness/check-docs.mjs)
 *   2) 이 배열의 enforcement  ↔  실제 ESLint 설정·스캔 스크립트·테스트 파일  (invariants.test.ts)
 *   3) 이 배열의 allowlist  ↔  packages/config/eslint/allowlists.js·scripts/harness/allowlists/  (invariants.test.ts)
 *
 * 룰 추가 절차: 여기에 항목 추가 → 문서에 [ID] 태그 → enforcement 구현 → 거부 케이스 테스트([TEST-01]).
 * 이 파일은 erasable TS만 사용한다 — scripts/harness/*.mjs가 빌드 없이 직접 import한다.
 */
import type { HarnessRule } from "./types.js";

/** PR 본문 필수 헤딩 — pr-forensics.mjs·pull_request_template.md가 동일 상수를 사용 */
export const PR_HEADINGS = {
  /** [PR-03] 프론트 완료 증거 섹션 */
  verification: ["## 검증", "## Verification"],
  /** [PR-02] 불변식 변경 사유 섹션 */
  invariantJustification: ["## Invariant 사유", "## Invariant Justification"],
} as const;

export const HARNESS_RULES: readonly HarnessRule[] = [
  // ── Console v2.7 Graph Invariants ─────────────────────────────────────────
  {
    id: "GRAPH-01",
    level: "invariant",
    area: "graph",
    rule: "4계층 catalog — L1 node_catalog/edge_catalog(DB), L2 ui-catalog(code), L3 page 노드, L4 workspace 싱글턴. catalog 편집은 lab only.",
    enforcement: [{ kind: "docs-sync" }],
    docs: { requiredIn: ["AGENTS.md", "CLAUDE.md"] },
  },
  {
    id: "GRAPH-02",
    level: "invariant",
    area: "graph",
    rule: "그래프 쓰기는 GraphWritePort(또는 core graph use-case)로만 — apps/MCP에서 Drizzle nodes/edges/schema 직접 CRUD 금지.",
    enforcement: [
      { kind: "eslint", ruleRef: "packages/config/eslint/boundaries.js#graphSchemaBoundary" },
      { kind: "docs-sync" },
    ],
    docs: { requiredIn: ["AGENTS.md", "CLAUDE.md"] },
    paths: [
      "packages/adapter-postgres/src/db/schema.ts",
      "packages/core/src/ports/graph-write-port.ts",
    ],
    allowlist: [
      {
        path: "apps/web/app/api/agent/cron/route.ts",
        reason: "베이스라인 — schema로 비그래프 테이블 직접 접근, port 경유 전환 대상",
      },
      {
        path: "apps/web/app/api/agent/dispatch/route.ts",
        reason: "베이스라인 — schema로 비그래프 테이블 직접 접근, port 경유 전환 대상",
      },
      {
        path: "apps/web/lib/console/resolve-org-page.ts",
        reason: "베이스라인 — schema 직접 접근, port 경유 전환 대상",
      },
      {
        path: "apps/web/lib/schedules/schedule-fan-out.ts",
        reason: "베이스라인 — schema 직접 접근, port 경유 전환 대상",
      },
    ],
  },
  {
    id: "GRAPH-03",
    level: "invariant",
    area: "graph",
    rule: "Catalog는 organization_id로 격리, 인스턴스는 teamspace_id로 귀속 — cross-org edge는 ORG_MISMATCH.",
    enforcement: [
      { kind: "unit-test", testPath: "packages/core/src/use-cases/graph/graph.test.ts" },
      { kind: "docs-sync" },
    ],
    docs: { requiredIn: ["AGENTS.md", "CLAUDE.md"] },
  },
  {
    id: "GRAPH-04",
    level: "invariant",
    area: "graph",
    rule: "인스턴스 → catalog FK only — node_type/edge_type text 컬럼을 재도입하지 않는다.",
    enforcement: [
      {
        kind: "scan-script",
        script: "scripts/harness/check-boundaries.mjs",
        checkId: "migration-schema-guard",
      },
      { kind: "docs-sync" },
    ],
    docs: { requiredIn: ["AGENTS.md", "CLAUDE.md"] },
    paths: ["supabase/migrations/**"],
  },
  {
    id: "GRAPH-05",
    level: "invariant",
    area: "graph",
    rule: "타입·properties 검증은 API 동작 — catalog에 없는 catalogKey·property_schema 위반은 커밋 전 reject.",
    enforcement: [
      { kind: "unit-test", testPath: "packages/core/src/use-cases/graph/graph.test.ts" },
      { kind: "docs-sync" },
    ],
    docs: { requiredIn: ["AGENTS.md", "CLAUDE.md"] },
  },
  {
    id: "GRAPH-06",
    level: "invariant",
    area: "graph",
    rule: "노드 봉투 = title + properties only — content/lifecycle_status DB 컬럼을 추가하지 않는다 (properties convention 사용).",
    enforcement: [
      {
        kind: "scan-script",
        script: "scripts/harness/check-boundaries.mjs",
        checkId: "migration-schema-guard",
      },
      { kind: "docs-sync" },
    ],
    docs: { requiredIn: ["AGENTS.md", "CLAUDE.md"] },
    paths: ["supabase/migrations/**"],
  },
  {
    id: "GRAPH-07",
    level: "invariant",
    area: "graph",
    rule: "시드 pack SSOT는 packages/contracts/seed-packs/software-development-workflow/ — onboarding·db:seed가 호출.",
    enforcement: [{ kind: "docs-sync" }],
    docs: { requiredIn: ["AGENTS.md", "CLAUDE.md"] },
  },
  {
    id: "GRAPH-08",
    level: "invariant",
    area: "graph",
    rule: "페이지 UI는 json-render 조합만 — 도메인 전용 React 페이지·라우트를 추가하지 않는다.",
    enforcement: [
      {
        kind: "scan-script",
        script: "scripts/harness/check-boundaries.mjs",
        checkId: "route-inventory",
      },
      { kind: "docs-sync" },
    ],
    docs: { requiredIn: ["AGENTS.md", "CLAUDE.md"] },
  },

  // ── Architecture ──────────────────────────────────────────────────────────
  {
    id: "ARCH-01",
    level: "invariant",
    area: "arch",
    rule: "의존 방향 apps/* → core ← adapters. packages/core는 IO 의존 0 (adapter·next 참조 금지).",
    enforcement: [
      { kind: "eslint", ruleRef: "packages/config/eslint/boundaries.js#coreIsolation" },
      { kind: "docs-sync" },
    ],
    docs: { requiredIn: ["AGENTS.md", "CLAUDE.md"] },
    paths: ["packages/core/package.json"],
  },
  {
    id: "ARCH-02",
    level: "invariant",
    area: "arch",
    rule: "apps는 adapter 내부 경로(deep import)를 참조하지 않는다 — 패키지 public export만 사용.",
    enforcement: [
      { kind: "eslint", ruleRef: "packages/config/eslint/boundaries.js#graphSchemaBoundary" },
      { kind: "docs-sync" },
    ],
    docs: { requiredIn: ["AGENTS.md", "CLAUDE.md"] },
  },
  {
    id: "ARCH-03",
    level: "invariant",
    area: "arch",
    rule: "과거 generic runtime(executeAction·ActionCommitPort·Gate·action_log)을 복원·의존하지 않는다.",
    enforcement: [
      {
        kind: "scan-script",
        script: "scripts/harness/check-boundaries.mjs",
        checkId: "legacy-runtime-guard",
      },
      { kind: "docs-sync" },
    ],
    docs: { requiredIn: ["AGENTS.md", "CLAUDE.md"] },
    allowlist: [
      {
        path: "packages/core/src/index.ts",
        reason: "잔존 legacy executeAction 코드 — 하네스 도입 시점 실측. 신규 사용 금지, 제거 대상 (스캐너가 신규 도입만 차단)",
      },
      {
        path: "packages/core/src/domain/types.ts",
        reason: "잔존 legacy ActionCommitPort 타입 — 제거 대상",
      },
      {
        path: "packages/core/src/testing/in-memory.ts",
        reason: "잔존 legacy in-memory 어댑터 — 제거 대상",
      },
    ],
  },

  // ── Security ──────────────────────────────────────────────────────────────
  {
    id: "SEC-01",
    level: "invariant",
    area: "security",
    rule: "SSOTA 테이블 전부 RLS deny-all — 격리는 core use-case + 서버 스코프 검증, DB 접근은 서버만.",
    enforcement: [
      {
        kind: "integration-test",
        testPath: "packages/adapter-postgres/tests/graph-instances.integration.test.ts",
      },
      { kind: "docs-sync" },
    ],
    docs: { requiredIn: ["AGENTS.md", "CLAUDE.md"] },
    paths: ["supabase/migrations/**"],
  },

  // ── Design system ─────────────────────────────────────────────────────────
  {
    id: "DS-01",
    level: "default",
    area: "design",
    rule: "임의 hex 컬러를 컴포넌트에 직접 쓰지 않는다 — semantic token만 사용.",
    enforcement: [
      {
        kind: "scan-script",
        script: "scripts/harness/check-boundaries.mjs",
        checkId: "raw-hex",
      },
      { kind: "docs-sync" },
    ],
    docs: { requiredIn: ["DESIGN.md"] },
  },
  {
    id: "DS-02",
    level: "default",
    area: "design",
    rule: "raw Tailwind palette 클래스(neutral-*/green-* 등)를 새 UI에 추가하지 않는다.",
    enforcement: [
      {
        kind: "scan-script",
        script: "scripts/harness/check-boundaries.mjs",
        checkId: "raw-palette",
      },
      { kind: "docs-sync" },
    ],
    docs: { requiredIn: ["DESIGN.md"] },
  },
  {
    id: "DS-03",
    level: "default",
    area: "design",
    rule: "Base UI render prop을 사용한다 — Radix asChild 패턴 금지.",
    enforcement: [
      { kind: "eslint", ruleRef: "packages/config/eslint/boundaries.js#designSystemRules" },
      { kind: "docs-sync" },
    ],
    docs: { requiredIn: ["DESIGN.md"] },
    allowlist: [
      {
        path: "apps/web/components/console/page-tree-nav.tsx",
        reason: "베이스라인 — Base UI render prop 전환 대상",
      },
      {
        path: "packages/ui/src/components/ui/drawer.tsx",
        reason: "베이스라인 — vaul drawer의 asChild, render prop 전환 대상",
      },
    ],
  },

  // ── Git / PR ──────────────────────────────────────────────────────────────
  {
    id: "GIT-01",
    level: "default",
    area: "git",
    rule: "커밋 제목 접두사 [core|adapter|mcp|web|e2e|infra] — 변경 레이어 기준, why 중심 한 줄.",
    enforcement: [
      { kind: "ci-check", workflow: ".github/workflows/harness.yml", job: "pr-forensics" },
      { kind: "docs-sync" },
    ],
    docs: { requiredIn: ["AGENTS.md", "CLAUDE.md"] },
  },
  {
    id: "GIT-02",
    level: "invariant",
    area: "git",
    rule: "main 직접 커밋·푸시 금지 — feature 브랜치 → PR → 머지로만 반영.",
    enforcement: [
      { kind: "docs-sync" },
      { kind: "manual", reason: "GitHub branch protection 설정으로 강제 (저장소 설정)" },
    ],
    docs: { requiredIn: ["AGENTS.md", "CLAUDE.md"] },
  },
  {
    id: "PR-01",
    level: "default",
    area: "pr",
    rule: "머지 전 pnpm lint·typecheck·test 그린 필수.",
    enforcement: [
      { kind: "ci-check", workflow: ".github/workflows/harness.yml", job: "harness-static" },
      { kind: "docs-sync" },
    ],
    docs: { requiredIn: ["AGENTS.md", "CLAUDE.md"] },
  },
  {
    id: "PR-02",
    level: "default",
    area: "pr",
    rule: "불변식 관련 경로를 건드리는 PR은 본문에 'Invariant 사유' 섹션으로 근거·해당 ID를 명시한다.",
    enforcement: [
      { kind: "ci-check", workflow: ".github/workflows/harness.yml", job: "pr-forensics" },
      { kind: "docs-sync" },
    ],
    docs: { requiredIn: ["AGENTS.md", "CLAUDE.md"] },
  },
  {
    id: "PR-03",
    level: "default",
    area: "pr",
    rule: "프론트 작업 완료 = 구현+정적검증 → E2E → 대화형 UI 검증 → PR에 산출물 첨부 (4단계 전부).",
    enforcement: [
      { kind: "ci-check", workflow: ".github/workflows/harness.yml", job: "pr-forensics" },
      { kind: "docs-sync" },
    ],
    docs: { requiredIn: ["AGENTS.md", "CLAUDE.md"] },
  },

  // ── Environment / Testing ─────────────────────────────────────────────────
  {
    id: "ENV-01",
    level: "default",
    area: "env",
    rule: "integration·e2e 인증은 smoke 계정(smoke@ssota.ai)으로만 — 실계정·service key 우회 금지.",
    enforcement: [
      { kind: "docs-sync" },
      { kind: "manual", reason: "e2e/helpers/auth.ts loginAsSmoke() 경유가 구조적 강제" },
    ],
    docs: { requiredIn: ["AGENTS.md", "CLAUDE.md"] },
  },
  {
    id: "ENV-02",
    level: "default",
    area: "env",
    rule: "스킬 미러 3종(.agents/.claude/.cursor)은 skills-lock.json과 정합해야 한다 — 정본은 .agents/skills/.",
    enforcement: [
      {
        kind: "scan-script",
        script: "scripts/harness/check-mirrors.mjs",
        checkId: "skills-mirrors",
      },
      { kind: "docs-sync" },
    ],
    docs: { requiredIn: ["AGENTS.md", "CLAUDE.md"] },
  },
  {
    id: "TEST-01",
    level: "default",
    area: "test",
    rule: "새 강제 규칙·포트를 추가하면 거부 케이스 테스트 필수 — 통과 케이스만 있는 PR은 불완전.",
    enforcement: [
      { kind: "docs-sync" },
      { kind: "manual", reason: "PR 리뷰에서 거부 케이스 존재를 확인" },
    ],
    docs: { requiredIn: ["AGENTS.md", "CLAUDE.md"] },
  },
];
