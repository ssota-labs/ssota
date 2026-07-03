#!/usr/bin/env node
/**
 * harness:env — 환경 프리플라이트. verify:*의 앞 단계에서 실행되어
 * "환경이 안 떠 있어서 실패하는 검증"을 시작 전에 잡고, 정확한 수리 명령을 알려준다.
 *
 * 기본(--quick): node/pnpm/의존성 — 네트워크·docker 불필요, <1s
 * full: + docker daemon, supabase 로컬, smoke 로그인 힌트
 * 플래그: --quick, --no-auth
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { Reporter, fromRoot } from "./lib.mjs";

const args = new Set(process.argv.slice(2));
const quick = args.has("--quick");
const reporter = new Reporter(quick ? "harness:env --quick" : "harness:env");

// 1. Node 버전
{
  const major = Number(process.versions.node.split(".")[0]);
  const nvmrc = readFileSync(fromRoot(".nvmrc"), "utf8").trim();
  const wanted = Number(nvmrc.replace(/^v/, "").split(".")[0]);
  if (major !== wanted) {
    reporter.fail("PR-01", `Node ${process.versions.node} 실행 중 — 이 저장소는 Node ${nvmrc} (.nvmrc)`, [
      `export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use ${wanted}`,
      `nvm에 ${wanted}가 없으면: nvm install ${wanted}`,
    ]);
  }
}

// 2. pnpm 버전 (packageManager pin)
{
  const pkg = JSON.parse(readFileSync(fromRoot("package.json"), "utf8"));
  const pinned = (pkg.packageManager ?? "").replace(/^pnpm@/, "");
  try {
    const actual = execSync("pnpm --version", { encoding: "utf8" }).trim();
    if (pinned && actual !== pinned) {
      reporter.warn("PR-01", `pnpm ${actual} ≠ pinned ${pinned} — corepack enable로 pin 버전을 사용하세요`);
    }
  } catch {
    reporter.fail("PR-01", "pnpm을 찾을 수 없습니다", ["corepack enable && corepack prepare pnpm --activate"]);
  }
}

// 3. 의존성 설치 여부
if (!existsSync(fromRoot("node_modules"))) {
  reporter.fail("PR-01", "node_modules가 없습니다 — 의존성 미설치", [
    "pnpm install --frozen-lockfile",
    "Cursor Cloud라면: pnpm cloud:prepare (Docker·Supabase·시드까지 한 번에)",
  ]);
}

if (!quick) {
  // 4. Docker daemon
  let dockerUp = false;
  try {
    execSync("docker info", { stdio: "ignore" });
    dockerUp = true;
  } catch {
    reporter.fail("ENV-01", "Docker daemon이 응답하지 않습니다 (supabase 로컬·integration·e2e 불가)", [
      "로컬: Docker Desktop을 실행하세요",
      "Cursor Cloud: pnpm cloud:prepare (docker.io 설치 + vfs dockerd 기동까지 수행)",
    ]);
  }

  // 5. Supabase 로컬 (54321 응답 여부 — 401도 '떠 있음'으로 간주)
  if (dockerUp) {
    const supabaseUp = await fetch("http://127.0.0.1:54321/auth/v1/health", {
      signal: AbortSignal.timeout(3000),
    })
      .then(() => true)
      .catch(() => false);
    if (!supabaseUp) {
      reporter.fail("ENV-01", "로컬 Supabase(54321)가 떠 있지 않습니다", [
        "pnpm exec supabase start",
        "이후 마이그레이션·시드: pnpm db:migrate && pnpm db:seed (또는 한 번에 pnpm e2e:prepare)",
      ]);
    } else if (!args.has("--no-auth")) {
      // 6. smoke 계정 로그인 (anon key가 .env.local에 있어야 시도 가능)
      const envLocal = existsSync(fromRoot("apps/web/.env.local"))
        ? readFileSync(fromRoot("apps/web/.env.local"), "utf8")
        : "";
      const anonKey = envLocal.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(\S+)/)?.[1];
      if (!anonKey) {
        reporter.warn("ENV-01", "apps/web/.env.local에 anon key가 없어 smoke 로그인 검사를 건너뜁니다 — pnpm sync:env 실행 권장");
      } else {
        const login = await fetch("http://127.0.0.1:54321/auth/v1/token?grant_type=password", {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: anonKey },
          body: JSON.stringify({ email: "smoke@ssota.ai", password: "1234" }),
          signal: AbortSignal.timeout(5000),
        })
          .then((res) => res.ok)
          .catch(() => false);
        if (!login) {
          reporter.fail("ENV-01", "smoke 계정(smoke@ssota.ai) 로그인 실패 — 시드가 안 됐거나 마이그레이션 미적용", [
            "pnpm db:migrate && pnpm db:seed",
            "그래도 실패하면 pnpm db:reset 후 재시드 (로컬 데이터 초기화 주의)",
          ]);
        }
      }
    }
  }
}

process.exit(reporter.flush() ? 0 : 1);
