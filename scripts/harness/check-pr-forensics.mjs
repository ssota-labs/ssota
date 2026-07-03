#!/usr/bin/env node
/**
 * 로컬 pr-forensics — GitHub CI의 pr-forensics job과 동일한 검사를 푸시 전에 실행.
 *
 *   pnpm harness:pr-forensics
 *   pnpm harness:pr-forensics -- --base main
 *   pnpm harness:pr-forensics -- --body-file ./draft-pr-body.md
 *
 * PR 본문 출처 (우선순위):
 *   1) --body-file
 *   2) 현재 브랜치의 GitHub PR (gh pr view)
 *   3) 빈 문자열 (PR 미생성 시 — 본문 관련 [PR-02]/[PR-03]만 실패할 수 있음)
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { repoRoot } from "./lib.mjs";
import { runPrForensics } from "./pr-forensics-core.mjs";

function parseArgs(argv) {
  let base = process.env.PR_FORENSICS_BASE ?? "main";
  let bodyFile = process.env.PR_FORENSICS_BODY_FILE ?? null;
  let branch = null;

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--base" && argv[i + 1]) {
      base = argv[++i];
      continue;
    }
    if (arg === "--body-file" && argv[i + 1]) {
      bodyFile = argv[++i];
      continue;
    }
    if (arg === "--branch" && argv[i + 1]) {
      branch = argv[++i];
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      console.log(`Usage: pnpm harness:pr-forensics [-- --base <ref>] [--body-file <path>] [--branch <name>]

로컬에서 Harness pr-forensics(CI)와 동일한 PR 본문·커밋 검사를 실행합니다.
푸시 전에 실행하면 GitHub에서 [PR-02]/[PR-03] 실패를 미리 잡을 수 있습니다.

  --base <ref>       diff/log 기준 브랜치 (기본: main, env PR_FORENSICS_BASE)
  --body-file <path> PR 본문 markdown 파일 (미지정 시 gh pr view 시도)
  --branch <name>    gh pr view 대상 브랜치 (기본: 현재 브랜치)
`);
      process.exit(0);
    }
  }

  return { base, bodyFile, branch };
}

function git(cmd) {
  return execSync(cmd, { cwd: repoRoot, encoding: "utf8" }).trim();
}

function tryGit(cmd) {
  try {
    return git(cmd);
  } catch {
    return null;
  }
}

function commandExists(name) {
  try {
    execSync(`command -v ${name}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function ghAvailable() {
  if (!commandExists("gh")) return false;
  try {
    execSync("gh auth status", { stdio: "ignore", cwd: repoRoot });
    return true;
  } catch {
    return false;
  }
}

function currentBranch() {
  return git("git branch --show-current");
}

function fetchBase(baseRef) {
  tryGit(`git fetch origin ${baseRef} --quiet`);
}

function resolveDiffRange(baseRef) {
  const ranges = [`origin/${baseRef}...HEAD`, `${baseRef}...HEAD`];
  for (const range of ranges) {
    const out = tryGit(`git diff --name-only ${range}`);
    if (out !== null) {
      return { range, changedFiles: out.split("\n").filter(Boolean) };
    }
  }
  throw new Error(
    `git diff 범위를 찾지 못했습니다 (시도: ${ranges.join(", ")}). ` +
      "`git fetch origin` 후 --base를 확인하세요.",
  );
}

function resolveCommitSubjects(baseRef, diffRange) {
  const range = diffRange.replace("...HEAD", "..HEAD");
  const out = tryGit(`git log ${range} --no-merges --format=%s`);
  if (out === null) {
    throw new Error(`git log 범위를 찾지 못했습니다: ${range}`);
  }
  return out.split("\n").filter(Boolean);
}

function resolvePrBodyAndBase({ bodyFile, branch, defaultBase }) {
  if (bodyFile) {
    console.log(`PR 본문: --body-file ${bodyFile}`);
    return { prBody: readFileSync(bodyFile, "utf8"), baseRef: defaultBase };
  }

  if (!ghAvailable()) {
    console.warn(
      "⚠ gh CLI가 없거나 미인증 — PR 본문을 가져오지 못했습니다. " +
        "gh pr view 또는 --body-file로 본문을 넘기세요.",
    );
    return { prBody: "", baseRef: defaultBase };
  }

  const targetBranch = branch ?? currentBranch();
  try {
    const raw = git(`gh pr view ${JSON.stringify(targetBranch)} --json body,baseRefName`);
    const parsed = JSON.parse(raw);
    const baseRef = parsed.baseRefName ?? defaultBase;
    console.log(`PR 본문: gh pr view ${targetBranch} (base: ${baseRef})`);
    return { prBody: parsed.body ?? "", baseRef };
  } catch {
    console.warn(
      `⚠ 브랜치 ${targetBranch}에 열린 PR이 없습니다 — PR 본문을 빈 문자열로 검사합니다. ` +
        "draft는 --body-file로 넘기세요.",
    );
    return { prBody: "", baseRef: defaultBase };
  }
}

const { base, bodyFile, branch } = parseArgs(process.argv);

const { prBody, baseRef: baseFromBody } = resolvePrBodyAndBase({
  bodyFile,
  branch,
  defaultBase: base,
});
const effectiveBase = baseFromBody;

fetchBase(effectiveBase);

const { range: diffRange, changedFiles } = resolveDiffRange(effectiveBase);
const commitSubjects = resolveCommitSubjects(effectiveBase, diffRange);

console.log(`diff 범위: ${diffRange}`);

const { ok } = await runPrForensics({ prBody, changedFiles, commitSubjects });
process.exit(ok ? 0 : 1);
