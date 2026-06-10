import { createClient } from "@supabase/supabase-js";
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { executeAction } from "@loopos/core";
import {
  createActionPorts,
  createDb,
  SMOKE_EMAIL,
  SMOKE_PASSWORD,
} from "@loopos/adapter-supabase";

const supabaseUrl = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

const runIfSupabase = () => !skip;
let skip = false;

describe("adapter-supabase integration", () => {
  let ports: ReturnType<typeof createActionPorts>;
  let smokeUserId: string;
  let client: ReturnType<typeof createDb>["client"] | undefined;

  beforeAll(async () => {
    try {
      const dbBundle = createDb();
      client = dbBundle.client;
      ports = createActionPorts(dbBundle.db);

      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: SMOKE_EMAIL,
        password: SMOKE_PASSWORD,
      });
      if (error) {
        skip = true;
        console.warn("Skipping integration tests:", error.message);
        return;
      }
      smokeUserId = data.user!.id;
    } catch (err) {
      skip = true;
      console.warn("Skipping integration tests — Supabase unavailable:", err);
    }
  });

  afterAll(async () => {
    await client?.end();
  });

  it.runIf(runIfSupabase)("smoke 계정 인증 성공", () => {
    expect(smokeUserId).toBeTruthy();
  });

  it.runIf(runIfSupabase)("create_note 커밋 + action_log 기록", async () => {
    const result = await executeAction(ports, {
      actionType: "create_note",
      input: { content: "Integration test note" },
      executorId: smokeUserId,
      executorType: "Agent",
    });

    expect(result.status).toBe("committed");

    const log = await ports.commit.getActionLog({ limit: 1 });
    expect(log.length).toBeGreaterThan(0);
    expect(log[0]?.outcome).toBe("committed");
  });

  it.runIf(runIfSupabase)(
    "비기록 변경 0건: commit은 항상 logEntry와 함께",
    async () => {
      const beforeCount = (await ports.commit.getActionLog({ limit: 1000 })).length;

      await executeAction(ports, {
        actionType: "create_note",
        input: { content: "Audit test" },
        executorId: smokeUserId,
        executorType: "Agent",
      });

      const afterCount = (await ports.commit.getActionLog({ limit: 1000 })).length;
      expect(afterCount).toBeGreaterThan(beforeCount);
    },
  );

  it.runIf(runIfSupabase)("promote_document는 Agent 호출 시 게이트 큐", async () => {
    const createResult = await executeAction(ports, {
      actionType: "create_document",
      input: { title: "Gate Test", content: "Body" },
      executorId: smokeUserId,
      executorType: "Agent",
    });
    expect(createResult.status).toBe("committed");

    const nodes = await ports.graph.queryNodes({ nodeType: "Document", limit: 1 });
    const node = nodes[nodes.length - 1];
    expect(node).toBeTruthy();

    const promoteResult = await executeAction(ports, {
      actionType: "promote_document",
      input: { nodeId: node!.id },
      executorId: smokeUserId,
      executorType: "Agent",
    });

    expect(promoteResult.status).toBe("gated");
  });
});
