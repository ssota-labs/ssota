/**
 * pr-forensics 검사 코어 — CI(pr-forensics.mjs)와 로컬(check-pr-forensics.mjs)이 공유.
 */
import { Reporter, loadRules, matchesGlob } from "./lib.mjs";

const COMMIT_PREFIX = /^\[(core|adapter|mcp|web|e2e|infra|dogfood)(\|[a-z|]+)?\]/;

const UI_FILE =
  (file) =>
    (file.startsWith("apps/web/") || file.startsWith("packages/ui/src/")) &&
    /\.(tsx|css)$/.test(file) &&
    !/\.(test|spec|stories)\./.test(file);

/**
 * @param {{
 *   prBody: string;
 *   changedFiles: string[];
 *   commitSubjects: string[];
 * }} input
 * @returns {Promise<{ ok: boolean; uiTouched: boolean; triggeredIds: string[] }>}
 */
export async function runPrForensics({ prBody, changedFiles, commitSubjects }) {
  const reporter = new Reporter("pr-forensics");
  const { rules, prHeadings } = await loadRules();

  for (const subject of commitSubjects) {
    if (!COMMIT_PREFIX.test(subject)) {
      reporter.fail("GIT-01", `커밋 제목에 레이어 접두사가 없습니다: "${subject}"`, [
        "git rebase -i로 커밋 메시지를 `[core|adapter|mcp|web|e2e|infra] why 한 줄` 형식으로 수정하세요",
        "어느 레이어인지는 변경 파일 기준: contracts/core→[core], adapter-*→[adapter], apps/web→[web], apps/mcp→[mcp], e2e/→[e2e], 그 외 인프라→[infra]",
      ]);
    }
  }

  const uiTouched = changedFiles.some(UI_FILE);
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
        "푸시 전 로컬 확인: pnpm harness:pr-forensics",
      ]);
    }
  }

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
          "푸시 전 로컬 확인: pnpm harness:pr-forensics",
        ],
      );
    }
  }

  console.log(
    `검사 대상: 커밋 ${commitSubjects.length}건, 변경 파일 ${changedFiles.length}건, UI 변경 ${uiTouched ? "있음" : "없음"}, 불변식 경로 교차 ${triggeredIds.size ? [...triggeredIds].join(",") : "없음"}`,
  );

  return {
    ok: reporter.flush(),
    uiTouched,
    triggeredIds: [...triggeredIds],
  };
}
