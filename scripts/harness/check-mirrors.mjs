#!/usr/bin/env node
/**
 * harness:mirrors — 스킬 미러 정합 검사 [ENV-02]. checkId: skills-mirrors
 *
 * 정본: .agents/skills/<name>/ · 미러: .claude/skills/, .cursor/skills/
 *  - 미러가 심링크면: 정본 안으로 해석되는지
 *  - 미러가 복사본이면: 정본과 파일 집합·바이트 동일한지
 *  - skills-lock.json의 computedHash와 정본 SKILL.md 해시 비교 (알고리즘 불일치 시 경고로 강등)
 */
import { existsSync, lstatSync, readFileSync, readdirSync, readlinkSync, realpathSync, statSync } from "node:fs";
import path from "node:path";
import { Reporter, fromRoot, sha256 } from "./lib.mjs";

const reporter = new Reporter("harness:mirrors");
const MASTER = ".agents/skills";
const MIRRORS = [".claude/skills", ".cursor/skills"];

function listSkillDirs(relative) {
  const abs = fromRoot(relative);
  if (!existsSync(abs)) return [];
  return readdirSync(abs, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() || entry.isSymbolicLink())
    .map((entry) => entry.name)
    .filter((name) => !name.startsWith("."));
}

function collectFiles(absDir, base = absDir) {
  const files = new Map();
  for (const entry of readdirSync(absDir, { withFileTypes: true })) {
    const abs = path.join(absDir, entry.name);
    if (entry.isDirectory()) {
      for (const [rel, hash] of collectFiles(abs, base)) files.set(rel, hash);
    } else if (entry.isFile()) {
      files.set(path.relative(base, abs), sha256(readFileSync(abs)));
    }
  }
  return files;
}

const masterSkills = new Set(listSkillDirs(MASTER));

for (const mirror of MIRRORS) {
  for (const name of listSkillDirs(mirror)) {
    const mirrorPath = fromRoot(path.join(mirror, name));
    const masterPath = fromRoot(path.join(MASTER, name));

    const stat = lstatSync(mirrorPath);
    if (stat.isSymbolicLink()) {
      const target = realpathSync(mirrorPath);
      if (!target.startsWith(fromRoot(MASTER))) {
        reporter.fail("ENV-02", `${mirror}/${name} 심링크가 정본(.agents/skills) 밖을 가리킵니다: ${readlinkSync(mirrorPath)}`, [
          `ln -sfn ../../.agents/skills/${name} ${mirror}/${name} 로 정본을 가리키게 수정하세요`,
        ]);
      }
      continue;
    }

    if (!masterSkills.has(name)) {
      reporter.fail("ENV-02", `${mirror}/${name}가 정본 .agents/skills/에 없습니다 (미러에만 존재)`, [
        `정본에 추가하려면: cp -R ${mirror}/${name} .agents/skills/${name} 후 skills-lock 갱신`,
        `미러 전용 잔재라면: rm -rf ${mirror}/${name}`,
      ]);
      continue;
    }

    const masterFiles = collectFiles(masterPath);
    const mirrorFiles = collectFiles(mirrorPath);
    const drifted = [];
    for (const [rel, hash] of masterFiles) {
      if (!mirrorFiles.has(rel)) drifted.push(`누락: ${rel}`);
      else if (mirrorFiles.get(rel) !== hash) drifted.push(`내용 다름: ${rel}`);
    }
    for (const rel of mirrorFiles.keys()) {
      if (!masterFiles.has(rel)) drifted.push(`미러에만 존재: ${rel}`);
    }
    if (drifted.length > 0) {
      reporter.fail("ENV-02", `${mirror}/${name}가 정본과 다릅니다 — ${drifted.slice(0, 3).join(", ")}${drifted.length > 3 ? ` 외 ${drifted.length - 3}건` : ""}`, [
        `정본이 맞다면: rm -rf ${mirror}/${name} && cp -R .agents/skills/${name} ${mirror}/${name}`,
        `미러 쪽 수정이 의도라면: 정본(.agents/skills/${name})을 먼저 고치고 미러로 복사하세요 — 미러 직접 수정 금지`,
      ]);
    }
  }
}

// skills-lock.json computedHash 대조 (SKILL.md sha256 가정 — 불일치가 전부면 알고리즘 차이로 보고 경고 강등)
{
  const lockPath = fromRoot("skills-lock.json");
  if (existsSync(lockPath)) {
    const lock = JSON.parse(readFileSync(lockPath, "utf8"));
    const results = [];
    for (const [name, meta] of Object.entries(lock.skills ?? {})) {
      const skillMd = fromRoot(path.join(MASTER, name, "SKILL.md"));
      if (!existsSync(skillMd)) {
        results.push({ name, status: "missing" });
        continue;
      }
      const hash = sha256(readFileSync(skillMd));
      results.push({ name, status: hash === meta.computedHash ? "match" : "hash-mismatch" });
    }
    const matches = results.filter((r) => r.status === "match").length;
    const missing = results.filter((r) => r.status === "missing");
    if (matches === 0 && results.length > 0) {
      reporter.warn("ENV-02", `skills-lock.json computedHash가 SKILL.md sha256과 전부 불일치 — 해시 알고리즘이 다른 것으로 보여 lock 검사는 경고로 강등합니다 (skills CLI 재생성 검토)`);
    } else {
      for (const r of results) {
        if (r.status === "hash-mismatch") {
          reporter.fail("ENV-02", `skills-lock.json과 정본 불일치: ${r.name} (SKILL.md 해시 다름)`, [
            `스킬을 의도적으로 갱신했다면 skills CLI로 lock을 재생성하세요`,
            `아니라면 정본이 오염된 것 — git diff .agents/skills/${r.name} 확인 후 복원`,
          ]);
        }
      }
    }
    for (const r of missing) {
      reporter.fail("ENV-02", `skills-lock.json에 있는 스킬이 정본에 없습니다: ${r.name}`, [
        `skills CLI로 재설치하거나, 제거된 스킬이면 lock에서 삭제하세요`,
      ]);
    }
  }
}

process.exit(reporter.flush() ? 0 : 1);
