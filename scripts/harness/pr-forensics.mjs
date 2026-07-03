#!/usr/bin/env node
/**
 * pr-forensics — 자연어 주장 포렌식 (CI, .github/workflows/harness.yml pr-forensics job).
 * 로컬 동일 검사: pnpm harness:pr-forensics
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
import { repoRoot } from "./lib.mjs";
import { runPrForensics } from "./pr-forensics-core.mjs";

const eventPath = process.env.GITHUB_EVENT_PATH;
if (!eventPath) {
  console.error(
    "GITHUB_EVENT_PATH가 없습니다 — CI에서는 pull_request 이벤트에서만 실행됩니다.\n" +
      "로컬 검사: pnpm harness:pr-forensics",
  );
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

const { ok } = await runPrForensics({ prBody, changedFiles, commitSubjects });
process.exit(ok ? 0 : 1);
