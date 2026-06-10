import { createClient } from "@supabase/supabase-js";
import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import { executeAction } from "@loopos/core";
import {
  createActionPorts,
  createConsolePort,
  createDb,
  DEFAULT_ORG_SLUG,
  DEFAULT_PROJECT_SLUG,
  SMOKE_EMAIL,
  SMOKE_PASSWORD,
} from "@loopos/adapter-supabase";

const supabaseUrl = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

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

  beforeEach((context) => {
    if (skip) context.skip();
  });

  it("smoke 계정 인증 성공", () => {
    expect(smokeUserId).toBeTruthy();
  });

  it("console: org/project slug resolve + smoke membership", async () => {
    const dbBundle = createDb();
    const consolePort = createConsolePort(dbBundle.db);

    const org = await consolePort.getOrganizationBySlug(DEFAULT_ORG_SLUG);
    expect(org).toBeTruthy();

    const project = await consolePort.getProjectBySlug(org!.id, DEFAULT_PROJECT_SLUG);
    expect(project).toBeTruthy();
    expect(project?.slug).toBe(DEFAULT_PROJECT_SLUG);

    const orgsForUser = await consolePort.listOrganizationsForUser(smokeUserId);
    expect(orgsForUser.some((item) => item.slug === DEFAULT_ORG_SLUG)).toBe(true);

    const nodeEntry = await ports.catalog.getNodeCatalogEntryBySlug("document");
    expect(nodeEntry?.nodeType).toBe("Document");
    expect(nodeEntry?.slug).toBe("document");

    await dbBundle.client?.end();
  });

  it("create_note 커밋 + action_log 기록", async () => {
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

  it(
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

  it("promote_document는 Agent 호출 시 게이트 큐", async () => {
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

  it(
    "define_node_type Human 커밋 + catalog 반영",
    async () => {
      const nodeType = `TestType_${Date.now()}`;
      const result = await executeAction(ports, {
        actionType: "define_node_type",
        input: {
          definition: {
            nodeType,
            family: "document",
            archetypeId: "doc-note",
            typicalValueOverrides: {},
            lifecycleTransitions: {
              Draft: ["Active", "Archived"],
              Active: ["Archived", "Draft"],
              Archived: ["Active"],
              Deleted: [],
            },
            contentGuide: "Integration test node type",
            propertyRefs: ["title"],
            allowedActionRefs: ["create_document"],
          },
        },
        executorId: smokeUserId,
        executorType: "Human",
      });

      expect(result.status).toBe("committed");

      const entry = await ports.catalog.getNodeCatalogEntry(nodeType);
      expect(entry).toBeTruthy();
      expect(entry?.contentGuide).toBe("Integration test node type");
      expect(entry?.propertyRefs).toContain("title");
      expect(entry?.allowedActionRefs).toContain("create_document");

      const log = await ports.commit.getActionLog({
        actionType: "define_node_type",
        limit: 1,
      });
      expect(log[0]?.outcome).toBe("committed");
    },
  );

  it(
    "define_instruction workflow fields round-trip",
    async () => {
      const title = `Workflow ${Date.now()}`;
      const result = await executeAction(ports, {
        actionType: "define_instruction",
        input: {
          definition: {
            title,
            triggerPatterns: ["manual"],
            applicableNodeTypes: ["Document"],
            requiredActions: ["create_document"],
            optionalActions: ["promote_document"],
            lifecycle: "Active",
            body: "Gather context, create a document, and report the result.",
            scope: { kind: "node_type", nodeType: "Document" },
            triggers: ["task_assigned"],
            workflowSteps: [
              {
                id: "gather_context",
                title: "Gather context",
                actionRefs: ["create_document"],
              },
            ],
            allowedActions: ["create_document", "promote_document"],
            outputContract: { format: "markdown" },
            gatePolicy: { catalogChanges: "always" },
            completionCriteria: "Document draft exists",
          },
        },
        executorId: smokeUserId,
        executorType: "Human",
      });

      expect(result.status).toBe("committed");
      const instructions = await ports.catalog.listInstructions({ limit: 100 });
      const created = instructions.find((instruction) => instruction.title === title);
      expect(created?.scope).toEqual({ kind: "node_type", nodeType: "Document" });
      expect(created?.workflowSteps[0]?.id).toBe("gather_context");
      expect(created?.allowedActions).toContain("create_document");
    },
  );

  it(
    "define_node_type Agent → gate 승인 → catalog 반영",
    async () => {
      const nodeType = `AgentType_${Date.now()}`;
      const gated = await executeAction(ports, {
        actionType: "define_node_type",
        input: {
          definition: {
            nodeType,
            family: "document",
            archetypeId: "doc-memo",
            typicalValueOverrides: {},
            lifecycleTransitions: {
              Draft: ["Active", "Archived"],
              Active: ["Archived", "Draft"],
              Archived: ["Active"],
              Deleted: [],
            },
            contentGuide: "Agent proposed type",
          },
        },
        executorId: smokeUserId,
        executorType: "Agent",
      });

      expect(gated.status).toBe("gated");
      if (gated.status !== "gated") return;

      const before = await ports.catalog.getNodeCatalogEntry(nodeType);
      expect(before).toBeNull();

      const approved = await executeAction(ports, {
        actionType: "approve_gate",
        input: { gateId: gated.gateId, status: "approved" },
        executorId: smokeUserId,
        executorType: "Human",
      });
      expect(approved.status).toBe("committed");

      const after = await ports.catalog.getNodeCatalogEntry(nodeType);
      expect(after?.nodeType).toBe(nodeType);

      const log = await ports.commit.getActionLog({ limit: 10 });
      expect(log.some((l) => l.actionType === "define_node_type")).toBe(true);
      expect(log.some((l) => l.actionType === "approve_gate")).toBe(true);
    },
  );
});
