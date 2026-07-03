/**
 * 하네스 공용 라이브러리 — plain Node(>=24), 외부 의존성 0.
 *
 * 원칙: 모든 실패 메시지는 "무엇이 왜 실패했는지 + 다음에 뭘 해야 하는지"를
 * 에이전트가 그대로 따라할 수 있는 지시문으로 출력한다.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export function findRepoRoot(startDir = path.dirname(fileURLToPath(import.meta.url))) {
  let dir = startDir;
  while (!existsSync(path.join(dir, "pnpm-workspace.yaml"))) {
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error("pnpm-workspace.yaml을 찾지 못했습니다 — 저장소 루트에서 실행하세요.");
    }
    dir = parent;
  }
  return dir;
}

export const repoRoot = findRepoRoot();
export const fromRoot = (relative) => path.join(repoRoot, relative);

/**
 * 계약 SSOT 로드 — Node type-stripping으로 rules.ts를 빌드 없이 직접 import.
 * (rules.ts는 erasable TS만 사용하므로 가능. 실패 시 rules.ts에 런타임 import가
 * 섞였는지 확인할 것 — packages/contracts/src/invariants/types.ts 상단 주석 참조)
 */
export async function loadRules() {
  const rulesPath = fromRoot("packages/contracts/src/invariants/rules.ts");
  const mod = await import(pathToFileURL(rulesPath).href);
  return { rules: mod.HARNESS_RULES, prHeadings: mod.PR_HEADINGS };
}

/** JS/TS 주석 제거 — 문자열·템플릿 리터럴 인지, 줄 번호 보존(개행 유지) */
export function stripComments(source) {
  let out = "";
  let i = 0;
  let state = "code"; // code | line | block | single | double | template
  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];
    if (state === "code") {
      if (ch === "/" && next === "/") {
        state = "line";
        i += 2;
        continue;
      }
      if (ch === "/" && next === "*") {
        state = "block";
        i += 2;
        continue;
      }
      if (ch === "'") state = "single";
      else if (ch === '"') state = "double";
      else if (ch === "`") state = "template";
      out += ch;
      i += 1;
      continue;
    }
    if (state === "line") {
      if (ch === "\n") {
        state = "code";
        out += ch;
      }
      i += 1;
      continue;
    }
    if (state === "block") {
      if (ch === "*" && next === "/") {
        state = "code";
        i += 2;
        continue;
      }
      if (ch === "\n") out += ch; // 줄 번호 보존
      i += 1;
      continue;
    }
    // 문자열 상태
    if (ch === "\\") {
      out += ch + (next ?? "");
      i += 2;
      continue;
    }
    if (
      (state === "single" && ch === "'") ||
      (state === "double" && ch === '"') ||
      (state === "template" && ch === "`")
    ) {
      state = "code";
    }
    out += ch;
    i += 1;
  }
  return out;
}

/** SQL 주석 제거 — `--` 라인 주석 + 블록 주석, 줄 번호 보존 */
export function stripSqlComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/--[^\n]*/g, "");
}

const DEFAULT_IGNORE_DIRS = new Set([
  "node_modules",
  ".next",
  "dist",
  ".turbo",
  ".git",
  "report",
  "test-results",
]);

/** 재귀 파일 수집 — exts: [".tsx"] 형태, 상대경로(repo 루트 기준) 반환 */
export function walkFiles(rootRelative, { exts, ignoreDirs = DEFAULT_IGNORE_DIRS } = {}) {
  const absRoot = fromRoot(rootRelative);
  if (!existsSync(absRoot)) return [];
  const results = [];
  const visit = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!ignoreDirs.has(entry.name)) visit(abs);
        continue;
      }
      if (!entry.isFile()) continue;
      if (exts && !exts.some((ext) => entry.name.endsWith(ext))) continue;
      results.push(path.relative(repoRoot, abs).split(path.sep).join("/"));
    }
  };
  visit(absRoot);
  return results;
}

export function loadAllowlist(name) {
  const p = fromRoot(`scripts/harness/allowlists/${name}.json`);
  if (!existsSync(p)) return [];
  return JSON.parse(readFileSync(p, "utf8"));
}

export function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

/** 최소 glob 매칭 — contracts invariants/index.ts의 matchesGlob과 동일 시맨틱 (`**`·`*`) */
export function matchesGlob(glob, filePath) {
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

export function readText(relative) {
  return readFileSync(fromRoot(relative), "utf8");
}

export function fileExists(relative) {
  return existsSync(fromRoot(relative));
}

export function isDirectory(relative) {
  return existsSync(fromRoot(relative)) && statSync(fromRoot(relative)).isDirectory();
}

/** 실패 수집기 — 체크 이름 단위로 지시문형 리포트를 출력하고 exit code를 정한다 */
export class Reporter {
  constructor(checkName) {
    this.checkName = checkName;
    this.failures = [];
    this.warnings = [];
  }

  fail(ruleId, problem, nextSteps = []) {
    this.failures.push({ ruleId, problem, nextSteps });
  }

  warn(ruleId, problem) {
    this.warnings.push({ ruleId, problem });
  }

  /** 통과 시 true 반환, 실패 시 지시문 출력 후 false */
  flush() {
    for (const w of this.warnings) {
      console.warn(`⚠ [${w.ruleId}] ${w.problem}`);
    }
    if (this.failures.length === 0) {
      console.log(`✓ ${this.checkName} passed`);
      return true;
    }
    console.error(`✖ ${this.checkName} failed (${this.failures.length}건)\n`);
    for (const f of this.failures) {
      console.error(`✖ [${f.ruleId}] ${f.problem}`);
      if (f.nextSteps.length > 0) {
        console.error("  Next steps:");
        f.nextSteps.forEach((step, idx) => console.error(`    ${idx + 1}. ${step}`));
      }
      console.error("");
    }
    console.error(
      `계약 정의: packages/contracts/src/invariants/rules.ts · 정책: AGENTS.md "Harness" 절.\n실패를 우회(체크 삭제·allowlist 몰래 추가)하지 말고 위 Next steps를 따르세요.`,
    );
    return false;
  }
}
