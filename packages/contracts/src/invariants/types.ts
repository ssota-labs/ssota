/**
 * 하네스 계약 타입 — 이 저장소의 규범(불변식·정책)을 typed data로 선언하기 위한 타입.
 *
 * 주의: 이 파일과 rules.ts는 **erasable TypeScript만** 사용한다 (enum·namespace·런타임 import 금지).
 * scripts/harness/*.mjs가 Node type-stripping으로 rules.ts를 빌드 없이 직접 import하기 때문이다.
 */

export type HarnessRuleLevel = "invariant" | "default" | "heuristic";

export type HarnessRuleArea =
  | "graph"
  | "action"
  | "arch"
  | "security"
  | "design"
  | "git"
  | "pr"
  | "env"
  | "test";

export type HarnessDocFile = "AGENTS.md" | "CLAUDE.md" | "DESIGN.md";

export type HarnessEnforcement =
  | {
      /** ESLint 룰로 강제 — ruleRef는 "파일경로#설정이름" */
      kind: "eslint";
      ruleRef: string;
    }
  | {
      /** scripts/harness 스캔 스크립트로 강제 */
      kind: "scan-script";
      script: string;
      checkId: string;
    }
  | {
      /** [ID] 태그가 문서에 존재하는지 check-docs.mjs가 강제 */
      kind: "docs-sync";
    }
  | {
      kind: "unit-test" | "integration-test";
      testPath: string;
    }
  | {
      /** CI 워크플로우 job으로 강제 */
      kind: "ci-check";
      workflow: string;
      job: string;
    }
  | {
      /** 기계 강제 없음 — 사유 필수. level=invariant 룰은 manual만으로는 불충분 */
      kind: "manual";
      reason: string;
    };

export interface HarnessAllowlistEntry {
  /** 저장소 루트 기준 상대 경로 (glob 아님 — 실존 파일) */
  path: string;
  reason: string;
}

export interface HarnessRule {
  /** "<AREA>-<NN>" — 고정, 재사용 금지. 문서에는 [GRAPH-02] 형태로 표기 */
  id: string;
  level: HarnessRuleLevel;
  area: HarnessRuleArea;
  /** 한국어 한 줄 — AGENTS.md/DESIGN.md 문구를 미러 */
  rule: string;
  enforcement: readonly HarnessEnforcement[];
  docs: { requiredIn: readonly HarnessDocFile[] };
  /** 이 glob과 교차하는 diff는 PR 본문에 Invariant 사유([PR-02])를 요구 */
  paths?: readonly string[];
  /** 룰 위반이 허용된 파일 — 예외는 숨기지 않고 데이터로 관리 */
  allowlist?: readonly HarnessAllowlistEntry[];
}
