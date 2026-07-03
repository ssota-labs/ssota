import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

/** 서버 프로세스 기동 시각 — 모듈 스코프에서 1회 고정 */
const startedAt = new Date().toISOString();

function findRepoRoot(): string | null {
  let dir = process.cwd();
  while (!existsSync(path.join(dir, "pnpm-workspace.yaml"))) {
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
  return dir;
}

/** git worktree의 .git은 `gitdir: <경로>` 파일일 수 있다 — child_process 없이 브랜치를 읽는다 */
function readGitBranch(repoRoot: string): string | null {
  try {
    const dotGit = path.join(repoRoot, ".git");
    let gitDir = dotGit;
    const stat = readFileSync(dotGit, "utf8");
    const worktreeMatch = stat.match(/^gitdir:\s*(.+)$/m);
    if (worktreeMatch?.[1]) {
      gitDir = path.resolve(repoRoot, worktreeMatch[1].trim());
    }
    const head = readFileSync(path.join(gitDir, "HEAD"), "utf8").trim();
    const refMatch = head.match(/^ref:\s*refs\/heads\/(.+)$/);
    return refMatch?.[1] ?? head.slice(0, 12);
  } catch {
    try {
      // .git이 디렉토리인 일반 체크아웃
      const head = readFileSync(path.join(repoRoot, ".git", "HEAD"), "utf8").trim();
      const refMatch = head.match(/^ref:\s*refs\/heads\/(.+)$/);
      return refMatch?.[1] ?? head.slice(0, 12);
    } catch {
      return null;
    }
  }
}

/**
 * dev 서버 identity 핸드셰이크 — "포트가 열려 있다 ≠ 내 서버다".
 * 여러 worktree가 dev:portless로 동시 기동되는 환경에서, 에이전트가 브라우저 검증 전에
 * scripts/harness/check-dev-identity.mjs로 이 응답을 자신의 worktree와 대조한다.
 * 프로덕션에서는 404 (dev 전용).
 */
export function GET() {
  if (process.env.NODE_ENV === "production") {
    return new Response(null, { status: 404 });
  }
  const repoRoot = findRepoRoot();
  return Response.json({
    worktree: process.env.WORKTREE_NAME ?? null,
    repoRoot,
    gitBranch: repoRoot ? readGitBranch(repoRoot) : null,
    startedAt,
  });
}
