#!/usr/bin/env node
/**
 * harness:docs — 문서 ↔ typed 계약 3방향 동기화 검증. 모든 verify:*와 루트
 * pnpm test의 첫 단계로 실행되어, 문서 드리프트가 다른 모든 검증을 차단한다.
 *
 * 검사 항목:
 *  1. 계약의 모든 [ID] 태그가 요구 문서(AGENTS/CLAUDE/DESIGN)에 존재
 *  2. AGENTS.md ↔ CLAUDE.md 핵심 섹션(그래프 불변식) 본문 동일 + 티어 어휘 양쪽 존재
 *  3. 필수 헤딩·검증 티어 어휘 존재
 *  4. 금지 스테일 패턴 부재 (구버전 계정·삭제된 경로 참조)
 *  5. 계약·스캔 allowlist의 죽은 예외(미존재 경로) 금지
 */
import { Reporter, fileExists, loadAllowlist, loadRules, readText } from "./lib.mjs";

const reporter = new Reporter("harness:docs");
const { rules } = await loadRules();

const docs = {
  "AGENTS.md": readText("AGENTS.md"),
  "CLAUDE.md": readText("CLAUDE.md"),
  "DESIGN.md": readText("DESIGN.md"),
};

// 1. [ID] 태그 존재
for (const rule of rules) {
  for (const docName of rule.docs.requiredIn) {
    if (!docs[docName].includes(`[${rule.id}]`)) {
      reporter.fail(rule.id, `${docName}에 [${rule.id}] 태그가 없습니다 — "${rule.rule}"`, [
        `${docName}의 해당 규범 문장에 [${rule.id}] 태그를 복원하세요`,
        `규범 자체를 바꾸려는 것이라면 packages/contracts/src/invariants/rules.ts의 ${rule.id}를 먼저 수정하고, 문서·강제 수단을 함께 갱신하세요`,
      ]);
    }
  }
}

// 2. AGENTS.md ↔ CLAUDE.md 동기화
function extractSection(source, heading) {
  const lines = source.split("\n");
  const start = lines.findIndex((line) => line.startsWith(heading));
  if (start === -1) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^## /.test(lines[i])) {
      end = i;
      break;
    }
  }
  return lines
    .slice(start + 1, end)
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

const INVARIANTS_HEADING = "## Console v2.7 Graph Invariants";
const agentsInvariants = extractSection(docs["AGENTS.md"], INVARIANTS_HEADING);
const claudeInvariants = extractSection(docs["CLAUDE.md"], INVARIANTS_HEADING);
if (agentsInvariants === null) {
  reporter.fail("GRAPH-01", `AGENTS.md에 "${INVARIANTS_HEADING}" 섹션이 없습니다`, [
    "AGENTS.md의 그래프 불변식 섹션을 복원하세요 (git diff로 삭제 여부 확인)",
  ]);
} else if (agentsInvariants !== claudeInvariants) {
  reporter.fail(
    "GRAPH-01",
    "AGENTS.md와 CLAUDE.md의 그래프 불변식 섹션 본문이 다릅니다 (두 파일은 동일 내용을 유지해야 함)",
    [
      "AGENTS.md를 정본으로 수정한 뒤 CLAUDE.md에 같은 내용을 복제하세요",
      "전체 재동기화: cp AGENTS.md CLAUDE.md 후 CLAUDE.md 상단 헤더(제목·안내문)만 복원",
    ],
  );
}

// 3. 필수 헤딩 + 티어 어휘
const REQUIRED_HEADINGS = [
  "## Console v2.7 Graph Invariants",
  "## Verification Tiers",
  "## Harness",
  "## Frontend 작업 완료 정의",
  "## Git 커밋 정책",
  "## PR Guidelines",
];
for (const heading of REQUIRED_HEADINGS) {
  for (const docName of ["AGENTS.md", "CLAUDE.md"]) {
    if (!docs[docName].includes(heading)) {
      reporter.fail("PR-01", `${docName}에 필수 섹션 "${heading}"이 없습니다`, [
        `${docName}에 해당 섹션을 복원하세요 — 문서를 "정리"하며 규범 섹션을 삭제하는 것은 허용되지 않습니다`,
      ]);
    }
  }
}

const TIER_VOCABULARY = ["Tier 0", "Tier 1", "Tier 2", "Tier 3", "Tier 4", "verify:quick", "verify:final", "harness:docs"];
for (const term of TIER_VOCABULARY) {
  for (const docName of ["AGENTS.md", "CLAUDE.md"]) {
    if (!docs[docName].includes(term)) {
      reporter.fail("PR-01", `${docName}에 검증 티어 어휘 "${term}"이 없습니다`, [
        `${docName}의 "## Verification Tiers"·"## Harness" 섹션이 온전한지 확인하고 복원하세요`,
      ]);
    }
  }
}

// 4. 금지 스테일 패턴 (문자열 조합으로 이 파일 자신은 매칭 회피)
const FORBIDDEN_PATTERNS = [
  { pattern: "smoke@ssota" + ".test", why: "smoke 계정은 smoke@ssota.ai다 (구버전 잔재)" },
  { pattern: "archive/generic-" + "runtime", why: "삭제된 디렉토리 참조 — 복원 금지 [ARCH-03], git 히스토리로 안내" },
  { pattern: "seed-packs/dev-" + "workflow/", why: "실제 경로는 seed-packs/software-development-workflow/다" },
];
for (const { pattern, why } of FORBIDDEN_PATTERNS) {
  for (const [docName, content] of Object.entries(docs)) {
    if (content.includes(pattern)) {
      reporter.fail("GRAPH-07", `${docName}에 금지 패턴 "${pattern}" — ${why}`, [
        `${docName}에서 해당 참조를 현행 사실로 교정하세요`,
      ]);
    }
  }
}

// 5. 죽은 allowlist 예외 금지
for (const rule of rules) {
  for (const entry of rule.allowlist ?? []) {
    if (!fileExists(entry.path)) {
      reporter.fail(rule.id, `계약 allowlist의 경로가 존재하지 않습니다: ${entry.path}`, [
        `packages/contracts/src/invariants/rules.ts의 ${rule.id} allowlist에서 해당 항목을 제거하세요 (예외가 더 이상 필요 없어진 것)`,
      ]);
    }
  }
}
for (const name of ["routes", "design-tokens"]) {
  for (const entry of loadAllowlist(name)) {
    if (!fileExists(entry.path)) {
      reporter.fail(entry.ruleId ?? "PR-01", `scripts/harness/allowlists/${name}.json의 경로가 존재하지 않습니다: ${entry.path}`, [
        `해당 항목을 allowlist에서 제거하세요 — 파일이 사라졌으면 예외도 사라져야 합니다`,
      ]);
    }
  }
}

process.exit(reporter.flush() ? 0 : 1);
