#!/usr/bin/env node
/**
 * pr-forensics — 자연어 주장 포렌식 (CI 전용, .github/workflows/harness.yml pr-forensics job).
 * "했다고 주장"이 아니라 "증거가 있는가"를 PR 본문·커밋에서 기계 검증한다.
 *
 *  [GIT-01] 모든 PR 커밋 제목이 [core|adapter|mcp|web|e2e|infra] 접두사 (머지 커밋 제외)
 *  [PR-03]  diff가 apps/web·packages/ui의 UI 경로를 건드리면 PR 본문에 검증 섹션
 *           + (a) e2e 아티팩트 참조 (b) 스크린샷 (c) agent-browser/Computer Use 언급
 *  [PR-02]  diff가 계약 rule.paths와 교차하면 PR 본문에 Invariant 사유 섹션 + 해당 ID
 *
 * 입력: GITHUB_EVENT_PATH(PR body·base), git diff/log (fetch-depth: 0 필요)
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { Reporter, loadRules, matchesGlob, repoRoot } from "./lib.mjs";

const reporter = new Reporter("pr-forensics");
const { rules, prHeadings } = await loadRules();

const eventPath = process.env.GITHUB_EVENT_PATH;
if (!eventPath) {
  console.error("GITHUB_EVENT_PATH가 없습니다 — 이 스크립트는 pull_request 이벤트의 CI에서만 실행됩니다.");
  process.exit(2);
}
const event = JSON.parse(readFileSync(eventPath, "utf8"));
const prBody = event.pull_request?.body ?? "";
const baseRef = event.pull_request?.base?.ref ?? "main";

const git = (cmd) => execSync(cmd, { cwd: repoRoot, encoding: "utf8" }).trim();
const changedFiles = git(`git diff --name-only origin/${baseRef}...HEAD`).split("\n").filter(Boolean);
const commitSubjects = git(`git log origin/${baseRef}..HEAD --no-merges --format=%s`)
  .split("\n")
  .filter(Boolean);

// ── [GIT-01] 커밋 접두사 ─────────────────────────────────────────────────────
const PREFIX = /^\[(core|adapter|mcp|web|e2e|infra|dogfood)(\|[a-z|]+)?\]/;
for (const subject of commitSubjects) {
  if (!PREFIX.test(subject)) {
    reporter.fail("GIT-01", `커밋 제목에 레이어 접두사가 없습니다: "${subject}"`, [
      "git rebase -i로 커밋 메시지를 `[core|adapter|mcp|web|e2e|infra] why 한 줄` 형식으로 수정하세요",
      "어느 레이어인지는 변경 파일 기준: contracts/core→[core], adapter-*→[adapter], apps/web→[web], apps/mcp→[mcp], e2e/→[e2e], 그 외 인프라→[infra]",
    ]);
  }
}

// ── [PR-03] 프론트 완료 증거 ─────────────────────────────────────────────────
const uiTouched = changedFiles.some(
  (file) =>
    (file.startsWith("apps/web/") || file.startsWith("packages/ui/src/")) &&
    /\.(tsx|css)$/.test(file) &&
    !/\.(test|spec|stories)\./.test(file),
);
if (uiTouched) {
  const hasVerificationHeading = prHeadings.verification.some((h) => prBody.includes(h));
  const hasE2eArtifact = /\/opt\/cursor\/artifacts\/e2e\/|results\.json|e2e\/report\//.test(prBody);
  const hasScreenshot = /!\[|<img\s/.test(prBody);
  const hasInteractive = /agent-browser|Computer Use|computerUse/i.test(prBody);
  const missing = [];
  if (!hasVerificationHeading) missing.push(`검증 섹션 헤딩 (${prHeadings.verification.join(" 또는 ")})`);
  if (!hasE2eArtifact) missing.push("e2e 아티팩트 참조 (/opt/cursor/artifacts/e2e/latest/ 경로 또는 리포트 링크)");
  if (!hasScreenshot) missing.push("스크린샷 첨부 (markdown 이미지)");
  if (!hasInteractive) missing.push("대화형 UI 검증 기록 (agent-browser 또는 Computer Use)");
  if (missing.length > 0) {
    reporter.fail("PR-03", `UI 변경 PR인데 완료 증거가 부족합니다 — 누락: ${missing.join(" / ")}`, [
      "AGENTS.md 'Frontend 작업 완료 정의' 4단계를 수행하세요: 구현+정적검증 → pnpm e2e → agent-browser/Computer Use → 산출물 첨부",
      "수행했다면 PR 본문에 증거(아티팩트 경로·스크린샷·검증 기록)를 추가하세요 — 수행 없이 본문만 채우는 것은 계약 위반입니다",
    ]);
  }
}

// ── [PR-02] Invariant 사유 ───────────────────────────────────────────────────
const triggeredIds = new Set();
for (const file of changedFiles) {
  for (const rule of rules) {
    if ((rule.paths ?? []).some((glob) => matchesGlob(glob, file))) {
      triggeredIds.add(rule.id);
    }
  }
}
if (triggeredIds.size > 0) {
  const hasJustificationHeading = prHeadings.invariantJustification.some((h) => prBody.includes(h));
  const idsMissingFromBody = [...triggeredIds].filter((id) => !prBody.includes(id));
  if (!hasJustificationHeading || idsMissingFromBody.length > 0) {
    reporter.fail(
      "PR-02",
      `불변식 관련 경로를 건드렸습니다 (${[...triggeredIds].join(", ")}) — PR 본문에 사유 섹션이 필요합니다`,
      [
        `PR 본문에 "${prHeadings.invariantJustification[0]}" 섹션을 추가하고, 건드린 불변식 ID(${[...triggeredIds].join(", ")})별로 왜 안전한지/왜 필요한지 설명하세요`,
        "불변식 자체를 바꾸는 변경이면 packages/contracts/src/invariants/rules.ts와 문서 태그도 같은 PR에서 갱신해야 합니다",
      ],
    );
  }
}

console.log(
  `검사 대상: 커밋 ${commitSubjects.length}건, 변경 파일 ${changedFiles.length}건, UI 변경 ${uiTouched ? "있음" : "없음"}, 불변식 경로 교차 ${triggeredIds.size ? [...triggeredIds].join(",") : "없음"}`,
);
process.exit(reporter.flush() ? 0 : 1);
