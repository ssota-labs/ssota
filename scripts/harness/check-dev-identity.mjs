#!/usr/bin/env node
/**
 * check-dev-identity — dev 서버 identity 핸드셰이크.
 * "포트가 열려 있다 ≠ 내 서버다". 브라우저·스크린샷 검증 전에 그 포트가
 * 내 worktree의 서버인지 확인한다 (여러 worktree가 dev:portless로 동시 기동되는 환경).
 *
 * 사용: node scripts/harness/check-dev-identity.mjs --url http://localhost:3000
 */
import { execSync } from "node:child_process";
import { repoRoot } from "./lib.mjs";

const urlFlag = process.argv.indexOf("--url");
const url = urlFlag !== -1 ? process.argv[urlFlag + 1] : null;
if (!url) {
  console.error("사용법: node scripts/harness/check-dev-identity.mjs --url http://localhost:<port>");
  process.exit(2);
}

const identity = await fetch(new URL("/api/dev-identity", url), {
  signal: AbortSignal.timeout(5000),
})
  .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
  .catch((err) => {
    console.error(`✖ ${url}에서 dev-identity 응답을 받지 못했습니다 (${err.message})`);
    console.error("  Next steps:");
    console.error("    1. 그 포트의 프로세스가 이 저장소의 Next.js dev 서버가 아닐 수 있습니다 — 포트를 확인하세요");
    console.error("    2. 내 dev 서버 기동: pnpm --filter web dev:portless (출력된 포트 사용)");
    process.exit(1);
  });

const myRepoRoot = execSync("git rev-parse --show-toplevel", { cwd: repoRoot, encoding: "utf8" }).trim();
const myWorktree = process.env.WORKTREE_NAME ?? null;
const myBranch = execSync("git branch --show-current", { cwd: repoRoot, encoding: "utf8" }).trim();

const problems = [];
if (identity.repoRoot && identity.repoRoot !== myRepoRoot) {
  problems.push(`서버 repoRoot=${identity.repoRoot} ≠ 내 worktree=${myRepoRoot}`);
}
if (myWorktree && identity.worktree && identity.worktree !== myWorktree) {
  problems.push(`서버 WORKTREE_NAME=${identity.worktree} ≠ 내 WORKTREE_NAME=${myWorktree}`);
}

if (problems.length > 0) {
  console.error(`✖ ${url}의 서버는 내 worktree의 서버가 아닙니다`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error("  Next steps:");
  console.error("    1. 그 서버를 죽이지 마세요 — 다른 worktree/세션의 서버입니다");
  console.error("    2. 내 dev 서버를 기동하고 출력된 포트를 사용하세요: pnpm --filter web dev:portless");
  console.error("    3. 다시 이 스크립트로 내 포트를 검증한 뒤 브라우저 검증을 진행하세요");
  process.exit(1);
}

console.log(`✓ ${url} = 내 worktree의 dev 서버 (branch: ${identity.gitBranch ?? myBranch}, worktree: ${identity.worktree ?? "-"}, started: ${identity.startedAt ?? "?"})`);
