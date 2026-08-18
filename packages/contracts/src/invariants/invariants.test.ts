/**
 * 하네스 계약 자체검증 — 계약(rules.ts)과 문서·강제 수단·allowlist의 3방향 동기화를
 * `pnpm --filter @ssota/contracts test` 로컬 실행에서도 실패하게 하는 이중 안전망.
 * (1차 게이트는 scripts/harness/check-docs.mjs — 루트 pnpm test 맨 앞에서 실행)
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

import { HARNESS_RULES, PR_HEADINGS, matchesGlob, rulesForPath } from "./index.js";

function findRepoRoot(): string {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  while (!existsSync(path.join(dir, "pnpm-workspace.yaml"))) {
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error("pnpm-workspace.yaml을 찾지 못했습니다");
    dir = parent;
  }
  return dir;
}

const repoRoot = findRepoRoot();
const fromRoot = (relative: string) => path.join(repoRoot, relative);

const enforcementSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("eslint"), ruleRef: z.string().min(1) }),
  z.object({
    kind: z.literal("scan-script"),
    script: z.string().min(1),
    checkId: z.string().min(1),
  }),
  z.object({ kind: z.literal("docs-sync") }),
  z.object({ kind: z.literal("unit-test"), testPath: z.string().min(1) }),
  z.object({ kind: z.literal("integration-test"), testPath: z.string().min(1) }),
  z.object({ kind: z.literal("ci-check"), workflow: z.string().min(1), job: z.string().min(1) }),
  z.object({ kind: z.literal("manual"), reason: z.string().min(1) }),
]);

const ruleSchema = z.object({
  id: z.string().regex(/^[A-Z]+-\d{2}$/),
  level: z.enum(["invariant", "default", "heuristic"]),
  area: z.enum(["graph", "action", "arch", "security", "design", "git", "pr", "env", "test"]),
  rule: z.string().min(1),
  enforcement: z.array(enforcementSchema).min(1),
  docs: z.object({
    requiredIn: z.array(z.enum(["AGENTS.md", "CLAUDE.md", "DESIGN.md"])).min(1),
  }),
  paths: z.array(z.string().min(1)).optional(),
  allowlist: z
    .array(z.object({ path: z.string().min(1), reason: z.string().min(1) }))
    .optional(),
});

describe("하네스 계약 형태", () => {
  it("모든 룰이 스키마에 맞는다", () => {
    for (const rule of HARNESS_RULES) {
      const result = ruleSchema.safeParse(rule);
      expect(result.success, `${rule.id}: ${JSON.stringify(result.success ? "" : result.error.issues)}`).toBe(true);
    }
  });

  it("룰 ID는 유일하다", () => {
    const ids = HARNESS_RULES.map((rule) => rule.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("invariant 레벨 룰은 manual 외 강제 수단이 1개 이상이다", () => {
    for (const rule of HARNESS_RULES.filter((r) => r.level === "invariant")) {
      const nonManual = rule.enforcement.filter((e) => e.kind !== "manual");
      expect(nonManual.length, `${rule.id}은 invariant인데 기계 강제가 없다`).toBeGreaterThan(0);
    }
  });
});

describe("강제 수단 실존", () => {
  it("eslint ruleRef가 실제 파일·export를 가리킨다", () => {
    for (const rule of HARNESS_RULES) {
      for (const e of rule.enforcement) {
        if (e.kind !== "eslint") continue;
        const [file, exportName] = e.ruleRef.split("#");
        if (!file || !exportName) {
          expect.fail(`${rule.id}: ruleRef "${e.ruleRef}"는 "파일경로#export이름" 형식이어야 합니다`);
        }
        expect(existsSync(fromRoot(file)), `${rule.id}: ${file} 없음`).toBe(true);
        const source = readFileSync(fromRoot(file), "utf8");
        expect(
          source.includes(`export const ${exportName}`),
          `${rule.id}: ${file}에 export const ${exportName} 없음`,
        ).toBe(true);
      }
    }
  });

  it("scan-script가 실제 스크립트·checkId를 가리킨다", () => {
    for (const rule of HARNESS_RULES) {
      for (const e of rule.enforcement) {
        if (e.kind !== "scan-script") continue;
        expect(existsSync(fromRoot(e.script)), `${rule.id}: ${e.script} 없음`).toBe(true);
        const source = readFileSync(fromRoot(e.script), "utf8");
        expect(source.includes(e.checkId), `${rule.id}: ${e.script}에 checkId "${e.checkId}" 없음`).toBe(true);
      }
    }
  });

  it("test 강제가 실제 테스트 파일을 가리킨다", () => {
    for (const rule of HARNESS_RULES) {
      for (const e of rule.enforcement) {
        if (e.kind !== "unit-test" && e.kind !== "integration-test") continue;
        expect(existsSync(fromRoot(e.testPath)), `${rule.id}: ${e.testPath} 없음`).toBe(true);
      }
    }
  });

  it("ci-check가 실제 워크플로우·job을 가리킨다", () => {
    for (const rule of HARNESS_RULES) {
      for (const e of rule.enforcement) {
        if (e.kind !== "ci-check") continue;
        expect(existsSync(fromRoot(e.workflow)), `${rule.id}: ${e.workflow} 없음`).toBe(true);
        const source = readFileSync(fromRoot(e.workflow), "utf8");
        expect(source.includes(`${e.job}:`), `${rule.id}: ${e.workflow}에 job "${e.job}" 없음`).toBe(true);
      }
    }
  });
});

describe("문서 동기화", () => {
  it("각 룰의 [ID] 태그가 요구 문서에 존재한다", () => {
    const docCache = new Map<string, string>();
    for (const rule of HARNESS_RULES) {
      for (const doc of rule.docs.requiredIn) {
        const content =
          docCache.get(doc) ?? readFileSync(fromRoot(doc), "utf8");
        docCache.set(doc, content);
        expect(content.includes(`[${rule.id}]`), `${doc}에 [${rule.id}] 태그 없음`).toBe(true);
      }
    }
  });

  it("PR 필수 헤딩 상수가 AGENTS.md에 문서화되어 있다", () => {
    const agents = readFileSync(fromRoot("AGENTS.md"), "utf8");
    expect(agents.includes(PR_HEADINGS.invariantJustification[0].replace("## ", ""))).toBe(true);
  });
});

describe("allowlist 정합", () => {
  it("계약 allowlist 경로가 디스크에 실존한다 (죽은 예외 금지)", () => {
    for (const rule of HARNESS_RULES) {
      for (const entry of rule.allowlist ?? []) {
        expect(existsSync(fromRoot(entry.path)), `${rule.id} allowlist: ${entry.path} 없음`).toBe(true);
      }
    }
  });

  it("ESLint allowlists.js의 경로는 계약 allowlist의 부분집합이다", async () => {
    const eslintAllowlistPath = fromRoot("packages/config/eslint/allowlists.js");
    expect(existsSync(eslintAllowlistPath), "packages/config/eslint/allowlists.js 없음").toBe(true);
    const { HARNESS_ESLINT_ALLOWLISTS } = await import(eslintAllowlistPath);
    const contractPaths = new Set(
      HARNESS_RULES.flatMap((rule) => (rule.allowlist ?? []).map((entry) => entry.path)),
    );
    for (const [ruleName, files] of Object.entries(HARNESS_ESLINT_ALLOWLISTS)) {
      for (const file of files as string[]) {
        const normalized = file.replace(/^\*\*\//, "");
        const covered = [...contractPaths].some((p) => p.endsWith(normalized) || p === normalized);
        expect(covered, `eslint allowlist(${ruleName}) "${file}"가 계약 allowlist에 없음`).toBe(true);
      }
    }
  });
});

describe("헬퍼", () => {
  it("matchesGlob — **·* 매칭", () => {
    expect(matchesGlob("supabase/migrations/**", "supabase/migrations/20260101_x.sql")).toBe(true);
    expect(matchesGlob("supabase/migrations/**", "apps/web/page.tsx")).toBe(false);
    expect(matchesGlob("packages/*/src/index.ts", "packages/core/src/index.ts")).toBe(true);
    expect(matchesGlob("packages/*/src/index.ts", "packages/core/src/deep/index.ts")).toBe(false);
  });

  it("rulesForPath — 마이그레이션 변경은 GRAPH-04·06·SEC-01을 트리거", () => {
    const ids = rulesForPath("supabase/migrations/20260703_add_col.sql").map((r) => r.id);
    expect(ids).toContain("GRAPH-04");
    expect(ids).toContain("GRAPH-06");
    expect(ids).toContain("SEC-01");
  });
});
