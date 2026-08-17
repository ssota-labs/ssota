#!/usr/bin/env node
/**
 * harness:boundaries — ESLint(AST)로 표현하기 어려운 우회 패턴을 주석 제거 후 스캔한다.
 * "명목상 계약을 따르지만 실질적으로 우회"하는 변경을 잡는 것이 목적.
 *
 * checkId 목록 (계약 rules.ts의 scan-script enforcement가 역참조):
 *  - migration-schema-guard : [GRAPH-04][GRAPH-06] 금지 컬럼 재도입 마이그레이션
 *  - route-inventory        : [GRAPH-08] 미등재 도메인 라우트(page.tsx) 신설
 *  - raw-hex                : [DS-01] 컴포넌트 내 임의 hex 컬러
 *  - raw-palette            : [DS-02] raw Tailwind palette 클래스
 *  - legacy-runtime-guard   : [ARCH-03] generic runtime 식별자 복원
 *  - vertical-boundaries    : [ARCH-04] 버티컬(ontology·agents·platform·shared) 역방향 import
 *  - disable-audit          : boundary 룰 eslint-disable에 [ID] 사유 누락
 */
import path from "node:path";
import {
  Reporter,
  loadAllowlist,
  loadRules,
  readText,
  stripComments,
  stripSqlComments,
  walkFiles,
} from "./lib.mjs";

const reporter = new Reporter("harness:boundaries");
const { rules } = await loadRules();

/** 계약 rules.ts의 rule.allowlist에 등록된 경로 (예외는 데이터로 관리 — AGENTS.md Harness 절) */
function contractAllowedPaths(ruleId) {
  const rule = rules.find((r) => r.id === ruleId);
  return new Set((rule?.allowlist ?? []).map((entry) => entry.path));
}

function findLines(source, regex) {
  const hits = [];
  const lines = source.split("\n");
  lines.forEach((line, idx) => {
    if (regex.test(line)) hits.push({ line: idx + 1, text: line.trim().slice(0, 120) });
  });
  return hits;
}

const allowedPaths = (name) => new Set(loadAllowlist(name).map((entry) => entry.path));

// ── migration-schema-guard [GRAPH-04][GRAPH-06] ─────────────────────────────
{
  const baseline = loadAllowlist("migrations-baseline");
  const baselineName = baseline.baselineMigration ?? "";
  const migrations = walkFiles("supabase/migrations", { exts: [".sql"] }).filter(
    (file) => path.basename(file) > baselineName,
  );
  for (const file of migrations) {
    const sql = stripSqlComments(readText(file));
    for (const statement of sql.split(";")) {
      const touchesGraphTables =
        /\b(create\s+table|alter\s+table)\b[\s\S]*?\b(nodes|edges)\b/i.test(statement);
      if (!touchesGraphTables) continue;
      if (/\b(node_type|edge_type)\b/i.test(statement)) {
        reporter.fail("GRAPH-04", `${file}: nodes/edges에 node_type/edge_type text 컬럼을 재도입하는 마이그레이션`, [
          "인스턴스 타입은 catalog FK(nodes.node_catalog_id / edges.edge_catalog_id)로만 표현합니다",
          "새 타입이 필요하면 node_catalog/edge_catalog에 row를 시드하세요 (packages/contracts/seed-packs/)",
        ]);
      }
      if (/\badd\s+column\s+"?(content|lifecycle_status)"?/i.test(statement)) {
        reporter.fail("GRAPH-06", `${file}: nodes/edges에 content/lifecycle_status 컬럼 추가 시도`, [
          "본문·lifecycle은 DB 컬럼이 아니라 properties convention입니다 — properties.content / properties.lifecycleStatus 사용",
          "읽기는 packages/core의 readNodeContent()/readLifecycleStatus() 헬퍼를 사용하세요",
        ]);
      }
    }
  }
}

// ── route-inventory [GRAPH-08] ──────────────────────────────────────────────
{
  const allowed = allowedPaths("routes");
  const pages = walkFiles("apps/web/app", { exts: ["page.tsx", "page.ts"] });
  for (const file of pages) {
    if (allowed.has(file)) continue;
    reporter.fail("GRAPH-08", `미등재 라우트: ${file} — 새 typed 페이지는 routes.json에 등록해야 합니다`, [
      "Company Workspace 등 트랜잭션 화면이면 scripts/harness/allowlists/routes.json에 등록하세요",
      "대시보드·리포트라면 L3 page 노드 json-render 조합을 쓰세요",
    ]);
  }
}

// ── raw-hex [DS-01] + raw-palette [DS-02] ───────────────────────────────────
{
  const allowed = allowedPaths("design-tokens");
  const uiFiles = [
    ...walkFiles("apps/web", { exts: [".tsx"] }),
    ...walkFiles("packages/ui/src", { exts: [".tsx"] }),
  ].filter((file) => !/\.(test|spec|stories)\.tsx$/.test(file));

  // 프리픽스에 `[` 포함 — Tailwind arbitrary value(`bg-[#ff0000]`)도 잡는다
  const HEX_COLOR = /(["'`[]|:\s*)#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/;
  const RAW_PALETTE =
    /\b(?:bg|text|border|ring|fill|stroke|from|to|via|divide|outline|decoration|shadow)-(?:neutral|gray|zinc|slate|stone|green|red|blue|yellow|orange|amber|lime|emerald|teal|cyan|sky|indigo|violet|purple|fuchsia|pink|rose)-(?:50|[1-9]50?|[1-9]00|950)\b/;

  for (const file of uiFiles) {
    if (allowed.has(file)) continue;
    const source = stripComments(readText(file));
    for (const hit of findLines(source, HEX_COLOR)) {
      reporter.fail("DS-01", `${file}:${hit.line} 임의 hex 컬러 — ${hit.text}`, [
        "DESIGN.md의 semantic token(bg-background, text-primary 등)으로 교체하세요",
        `불가피하면(차트 팔레트 등) scripts/harness/allowlists/design-tokens.json에 {"path": "${file}", "ruleId": "DS-01", "reason": "<사유>"}로 등록하세요`,
      ]);
    }
    for (const hit of findLines(source, RAW_PALETTE)) {
      reporter.fail("DS-02", `${file}:${hit.line} raw Tailwind palette 클래스 — ${hit.text}`, [
        "semantic token으로 교체하세요 (DESIGN.md §2 Color System)",
        `불가피하면 scripts/harness/allowlists/design-tokens.json에 {"path": "${file}", "ruleId": "DS-02", "reason": "<사유>"}로 등록하세요`,
      ]);
    }
  }
}

// ── legacy-runtime-guard [ARCH-03] ──────────────────────────────────────────
{
  const scanRoots = ["apps/web", "apps/mcp", "packages/core/src", "packages/adapter-postgres/src", "packages/adapter-supabase/src"];
  const LEGACY = /\b(executeAction|ActionCommitPort|action_log)\b/;
  const allowed = contractAllowedPaths("ARCH-03");
  for (const root of scanRoots) {
    for (const file of walkFiles(root, { exts: [".ts", ".tsx"] })) {
      if (/\.(test|spec)\.tsx?$/.test(file)) continue;
      if (allowed.has(file)) continue;
      const source = stripComments(readText(file));
      for (const hit of findLines(source, LEGACY)) {
        reporter.fail("ARCH-03", `${file}:${hit.line} generic runtime 식별자 복원 시도 — ${hit.text}`, [
          "executeAction/ActionCommitPort/action_log 패턴은 active product에 적용하지 않습니다 (AGENTS.md Legacy Runtime 절)",
          "그래프 쓰기는 core graph use-case + GraphWritePort로 구현하세요 [GRAPH-02]",
        ]);
      }
    }
  }
}

// ── vertical-boundaries [ARCH-04] ───────────────────────────────────────────
// 허용 방향: platform ← ontology ← agents, shared는 어느 버티컬도 import하지 않음.
{
  const VERTICALS = new Set(["ontology", "agents", "platform", "shared"]);
  const ALLOWED = {
    ontology: new Set(["ontology", "platform", "shared"]),
    agents: new Set(["agents", "ontology", "platform", "shared"]),
    platform: new Set(["platform", "shared"]),
    shared: new Set(["shared"]),
  };
  const scanRoots = [
    "packages/contracts/src",
    "packages/core/src",
    "packages/adapter-postgres/src",
  ];
  const allowed = contractAllowedPaths("ARCH-04");
  const SPEC = /(?:from|import)\s*\(?\s*"(\.[^"]+)"/g;
  for (const root of scanRoots) {
    for (const file of walkFiles(root, { exts: [".ts"] })) {
      if (/\.(test|spec)\.tsx?$/.test(file)) continue;
      const rel = path.relative(root, file).split(path.sep);
      // adapter는 ports/<버티컬>·db/schema/<버티컬> 2단 구조도 지원
      const fromVertical = rel.find((seg) => VERTICALS.has(seg));
      if (!fromVertical) continue; // 루트 파일(index.ts·invariants 등)은 제약 없음
      if (allowed.has(file)) continue;
      const source = stripComments(readText(file));
      const fileDir = path.dirname(file);
      for (const m of source.matchAll(SPEC)) {
        const target = path.normalize(path.join(fileDir, m[1]));
        const targetRel = path.relative(root, target);
        if (targetRel.startsWith("..")) continue; // 패키지 밖(seed-packs 등)
        const toVertical = targetRel.split(path.sep).find((seg) => VERTICALS.has(seg));
        if (!toVertical) continue; // 루트 파일 참조는 허용
        if (!ALLOWED[fromVertical].has(toVertical)) {
          reporter.fail("ARCH-04", `${file}: ${fromVertical} → ${toVertical} import 금지 — ${m[1]}`, [
            "허용 방향: platform ← ontology ← agents. shared는 버티컬을 import하지 않습니다 (ADR-vertical-package-structure)",
            "역방향 의존이 정당하면 포트 역전(ontology가 포트 정의, agents가 구현)을 검토하세요",
            `불가피하면 rules.ts ARCH-04 allowlist에 {path, reason}으로 등록하세요`,
          ]);
        }
      }
    }
  }
}

// ── disable-audit ───────────────────────────────────────────────────────────
{
  const scanRoots = ["apps", "packages"];
  const DISABLE = /eslint-disable[^\n]*(no-restricted-imports|no-restricted-syntax)/;
  const HAS_RULE_ID = /\[[A-Z]+-\d{2}\]/;
  for (const root of scanRoots) {
    for (const file of walkFiles(root, { exts: [".ts", ".tsx", ".js", ".mjs"] })) {
      const source = readText(file); // 주석을 검사하는 것이므로 strip하지 않음
      const lines = source.split("\n");
      lines.forEach((line, idx) => {
        if (DISABLE.test(line) && !HAS_RULE_ID.test(line)) {
          reporter.fail("PR-02", `${file}:${idx + 1} boundary 룰 eslint-disable에 [ID] 사유가 없습니다`, [
            "disable 주석에 해당 계약 ID와 사유를 명시하세요 — 예: // eslint-disable-next-line no-restricted-syntax -- [GRAPH-02] <사유>",
            "가능하면 disable 대신 packages/config/eslint/allowlists.js에 경로를 등록하세요 (예외는 데이터로 관리)",
          ]);
        }
      });
    }
  }
}

process.exit(reporter.flush() ? 0 : 1);
