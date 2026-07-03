/**
 * 하네스 계약 public API — 룰 데이터 + 순수 헬퍼.
 * zod 등 런타임 의존을 추가하지 않는다 (검증은 invariants.test.ts에서).
 */
import type { HarnessRule } from "./types.js";
import { HARNESS_RULES, PR_HEADINGS } from "./rules.js";

export type {
  HarnessRule,
  HarnessRuleLevel,
  HarnessRuleArea,
  HarnessDocFile,
  HarnessEnforcement,
  HarnessAllowlistEntry,
} from "./types.js";
export { HARNESS_RULES, PR_HEADINGS };

export function getRuleById(id: string): HarnessRule | undefined {
  return HARNESS_RULES.find((rule) => rule.id === id);
}

/** 최소 glob 매칭 — `**`(경로 구분자 포함 임의)·`*`(구분자 제외 임의)만 지원 */
export function matchesGlob(glob: string, filePath: string): boolean {
  const pattern = glob
    .split(/(\*\*|\*)/)
    .map((part) => {
      if (part === "**") return ".*";
      if (part === "*") return "[^/]*";
      return part.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("");
  return new RegExp(`^${pattern}$`).test(filePath);
}

/** 변경 파일이 건드리는 룰 목록 — PR-02 (Invariant 사유) 트리거 판정에 사용 */
export function rulesForPath(changedFile: string): HarnessRule[] {
  return HARNESS_RULES.filter((rule) =>
    (rule.paths ?? []).some((glob) => matchesGlob(glob, changedFile)),
  );
}
