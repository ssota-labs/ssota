/**
 * SSOTA-on-SSOTA dogfood 초기 그래프 인스턴스 시드.
 * 카탈로그 시드(db:seed + db:seed:ops) 이후 실행: pnpm db:seed:dogfood
 */
import { createClient } from "@supabase/supabase-js";
import { executeAction } from "@ssota/core";
import {
  createActionPorts,
  createConsolePort,
  createDb,
  DEFAULT_ORG_SLUG,
  DEFAULT_PROJECT_SLUG,
  SMOKE_EMAIL,
  SMOKE_PASSWORD,
} from "../index.js";

const DOGFOOD_PREFIX = "dogfood-v1";
/** Console dogfood — 내부 운영용 opaque subject (B2B2C 최종고객 아님) */
const DOGFOOD_SUBJECT_ID = "ssota-labs-dogfood";

async function getSmokeUserId(): Promise<string> {
  const supabaseUrl = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY ??
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: SMOKE_EMAIL,
    password: SMOKE_PASSWORD,
  });
  if (error || !data.user?.id) throw error ?? new Error("smoke login failed");
  return data.user.id;
}

async function main() {
  const executorId = await getSmokeUserId();
  const { db, client } = createDb();
  const consolePort = createConsolePort(db);
  const org = await consolePort.getOrganizationBySlug(DEFAULT_ORG_SLUG);
  const project = await consolePort.getProjectBySlug(org!.id, DEFAULT_PROJECT_SLUG);
  const projectId = project!.id;
  const ports = createActionPorts(db, { projectId });

  const run = async (
    actionType: string,
    input: Record<string, unknown>,
    key: string,
    options?: { subjectId?: string },
  ) => {
    const result = await executeAction(ports, {
      projectId,
      actionType,
      input,
      executorId,
      executorType: "Agent",
      idempotencyKey: `${DOGFOOD_PREFIX}:${key}`,
      subjectId: options?.subjectId,
    });
    if (result.status !== "committed") {
      throw new Error(`${actionType} failed: ${result.status} ${"reason" in result ? result.reason : ""}`);
    }
    const nodeId =
      result.effects?.[0]?.kind === "create_node"
        ? (result as { nodeId?: string }).nodeId
        : undefined;
    console.log(`✓ ${actionType} → ${nodeId ?? "committed"}`);
    return result;
  };

  console.log(`Seeding dogfood instances for ${DEFAULT_PROJECT_SLUG} (${projectId})`);

  await run(
    "create_actor",
    { name: "Cursor Cloud Agent", actor_type: "Agent", role: "dogfood executor" },
    "actor-agent",
  );
  await run(
    "create_actor",
    { name: "SSOTA Labs Team", actor_type: "Team", role: "accountable" },
    "actor-team",
  );
  await run(
    "create_objective",
    {
      title: "SSOTA-on-SSOTA dogfood — 실제 개발 운영을 그래프로",
      summary: "에이전트가 MCP로 개발 운영 그래프를 읽고 쓰며 SSOTA 자체를 개발한다.",
      period: "2026-Q2",
      status: "Active",
    },
    "objective-main",
  );
  await run(
    "create_key_result",
    {
      title: "MCP로 Objective→Feature→Task→PR 흐름 1회 완주",
      metric_name: "dogfood_flow_count",
      target_value: 1,
      current_value: 0,
      unit: "flows",
      status: "In Progress",
    },
    "kr-flow",
  );
  await run(
    "create_project",
    {
      title: "개발 운영 그래프 v1",
      subject_id: DOGFOOD_SUBJECT_ID,
      summary: "Objective~Release 운영단 카탈로그와 dogfood 인스턴스",
    },
    "project-ops-graph",
    { subjectId: DOGFOOD_SUBJECT_ID },
  );
  await run(
    "create_feature",
    {
      title: "ssota-dev 운영 카탈로그",
      summary: "Objective~Release 노드·엣지·create 액션 MCP 노출",
      user_value: "에이전트가 개발 운영 단위를 그래프로 생성·조회",
      priority: "P0",
      status: "Active",
    },
    "feature-catalog",
  );
  await run(
    "create_feature",
    {
      title: "MCP dogfood 플로우 검증",
      summary: "호스팅 MCP에서 execute_action·query_nodes E2E",
      user_value: "리모트 mcp.ssota.ai에서 카탈로그·쓰기 동작",
      priority: "P0",
      status: "In Progress",
    },
    "feature-mcp-verify",
  );

  console.log("Dogfood instance seed complete.");
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
