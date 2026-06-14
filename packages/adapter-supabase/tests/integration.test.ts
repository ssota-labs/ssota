import { createClient } from "@supabase/supabase-js";
import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import { executeAction } from "@ssota/core";
import {
  createActionPorts,
  createConsolePort,
  createDb,
  DEFAULT_ORG_SLUG,
  DEFAULT_PROJECT_SLUG,
  SMOKE_EMAIL,
  SMOKE_PASSWORD,
} from "@ssota/adapter-supabase";

const supabaseUrl = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

let skip = false;

describe("adapter-supabase integration", () => {
  let ports: ReturnType<typeof createActionPorts>;
  let smokeUserId: string;
  let projectId: string;
  let client: ReturnType<typeof createDb>["client"] | undefined;

  beforeAll(async () => {
    try {
      const dbBundle = createDb();
      client = dbBundle.client;

      const consolePort = createConsolePort(dbBundle.db);
      const org = await consolePort.getOrganizationBySlug(DEFAULT_ORG_SLUG);
      if (!org) {
        skip = true;
        console.warn("Skipping integration tests: default org not found");
        return;
      }
      const project = await consolePort.getProjectBySlug(org.id, DEFAULT_PROJECT_SLUG);
      if (!project) {
        skip = true;
        console.warn("Skipping integration tests: default project not found");
        return;
      }
      projectId = project.id;
      ports = createActionPorts(dbBundle.db, { projectId: project.id });

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

  it("RLS deny-all: anon/authenticated PostgREST로 그래프 테이블 접근 불가", async () => {
    const anonClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: anonData, error: anonError } = await anonClient
      .from("nodes")
      .select("id")
      .limit(1);
    expect(anonError).toBeNull();
    expect(anonData).toEqual([]);

    const authedClient = createClient(supabaseUrl, supabaseAnonKey);
    const { error: signInError } = await authedClient.auth.signInWithPassword({
      email: SMOKE_EMAIL,
      password: SMOKE_PASSWORD,
    });
    expect(signInError).toBeNull();

    const { data: authedData, error: authedError } = await authedClient
      .from("nodes")
      .select("id")
      .limit(1);
    expect(authedError).toBeNull();
    expect(authedData).toEqual([]);

    const { error: insertError } = await authedClient.from("nodes").insert({
      node_type: "Document",
      lifecycle_status: "Draft",
      properties: {},
      provenance: {},
    });
    expect(insertError).toBeTruthy();
    expect(insertError?.message.toLowerCase()).toContain("row-level security");
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

  it("create_node(Note) 커밋 + action_log 기록", async () => {
    const result = await executeAction(ports, {
      actionType: "create_node",
      input: {
        nodeType: "Note",
        title: "Integration test note",
        content: "Integration test note",
      },
      executorId: smokeUserId,
      executorType: "Agent",
      projectId,
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
        actionType: "create_node",
        input: {
          nodeType: "Note",
          title: "Audit test",
          content: "Audit test",
        },
        executorId: smokeUserId,
        executorType: "Agent",
        projectId,
      });

      const afterCount = (await ports.commit.getActionLog({ limit: 1000 })).length;
      expect(afterCount).toBeGreaterThan(beforeCount);
    },
  );

  it("promote_document는 Agent 호출 시 게이트 큐", async () => {
    const createResult = await executeAction(ports, {
      actionType: "create_node",
      input: {
        nodeType: "Document",
        title: "Gate Test",
        content: "Body",
      },
      executorId: smokeUserId,
      executorType: "Agent",
      projectId,
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
      projectId,
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
            propertySchema: {
              title: {
                valueType: "string",
                constraints: {},
                required: true,
                system: true,
              },
            },
            allowedActionRefs: ["create_node"],
          },
        },
        executorId: smokeUserId,
      executorType: "Human",
      projectId,
    });

      expect(result.status).toBe("committed");

      const entry = await ports.catalog.getNodeCatalogEntry(nodeType);
      expect(entry).toBeTruthy();
      expect(entry?.contentGuide).toBe("Integration test node type");
      expect(entry?.propertySchema.title).toBeTruthy();
      expect(entry?.allowedActionRefs).toContain("create_node");

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
            requiredActions: ["create_node"],
            optionalActions: ["promote_document"],
            lifecycle: "Active",
            body: "Gather context, create a document, and report the result.",
            scope: { kind: "node_type", nodeType: "Document" },
            triggers: [
              { id: "task_assigned", kind: "task_assigned", enabled: true, config: {} },
            ],
            workflowSteps: [
              {
                id: "gather_context",
                title: "Gather context",
                actionRefs: ["create_node"],
              },
            ],
            allowedActions: ["create_node", "promote_document"],
            outputContract: { format: "markdown" },
            gatePolicy: { catalogChanges: "always" },
            completionCriteria: "Document draft exists",
          },
        },
        executorId: smokeUserId,
      executorType: "Human",
      projectId,
    });

      expect(result.status).toBe("committed");
      const instructions = await ports.catalog.listInstructions({ limit: 100 });
      const created = instructions.find((instruction) => instruction.title === title);
      expect(created?.scope).toEqual({ kind: "node_type", nodeType: "Document" });
      expect(created?.workflowSteps[0]?.id).toBe("gather_context");
      expect(created?.allowedActions).toContain("create_node");
    },
  );

  it(
    "define_instruction contentUrl + instructionKey round-trip",
    async () => {
      const instructionKey = `ext_runbook_${Date.now()}`;
      const contentUrl = "https://example.com/runbooks/test";
      const result = await executeAction(ports, {
        actionType: "define_instruction",
        input: {
          definition: {
            title: `External workflow ${Date.now()}`,
            instructionKey,
            triggerPatterns: ["manual"],
            applicableNodeTypes: [],
            requiredActions: ["create_node"],
            optionalActions: [],
            lifecycle: "Active",
            contentUrl,
            scope: { kind: "global" },
            triggers: [],
            workflowSteps: [],
            allowedActions: ["create_node"],
            outputContract: {},
            gatePolicy: {},
            completionCriteria: null,
          },
        },
        executorId: smokeUserId,
        executorType: "Human",
        projectId,
      });

      expect(result.status).toBe("committed");
      const byKey = await ports.catalog.getInstructionByKey(instructionKey);
      expect(byKey?.contentUrl).toBe(contentUrl);
      expect(byKey?.body).toBeNull();
    },
  );

  it(
    "define_node_type Agent 커밋 + catalog 반영",
    async () => {
      const nodeType = `AgentType_${Date.now()}`;
      const result = await executeAction(ports, {
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
        projectId,
      });

      expect(result.status).toBe("committed");

      const entry = await ports.catalog.getNodeCatalogEntry(nodeType);
      expect(entry?.nodeType).toBe(nodeType);
      expect(entry?.contentGuide).toBe("Agent proposed type");

      const log = await ports.commit.getActionLog({
        actionType: "define_node_type",
        limit: 1,
      });
      expect(log[0]?.outcome).toBe("committed");
    },
  );

  it("homepage agent: project → brief → link", async () => {
    const tenantId = `usr_homepage_${Date.now()}`;

    const project = await executeAction(ports, {
      actionType: "create_node",
      input: {
        nodeType: "HomepageProject",
        title: "Smoke Homepage",
        properties: { subject_id: tenantId },
      },
      executorId: smokeUserId,
      executorType: "Agent",
      projectId,
    });
    expect(project.status).toBe("committed");

    const brief = await executeAction(ports, {
      actionType: "create_node",
      input: {
        nodeType: "DesignBrief",
        title: "Smoke brief",
        content: "Integration test homepage brief",
        properties: { subject_id: tenantId },
      },
      executorId: smokeUserId,
      executorType: "Agent",
      projectId,
    });
    expect(brief.status).toBe("committed");

    const projects = await ports.graph.queryNodes({
      nodeType: "HomepageProject",
      limit: 5,
    });
    const briefs = await ports.graph.queryNodes({
      nodeType: "DesignBrief",
      limit: 5,
    });
    const homepage = projects.find((n) => n.properties.title === "Smoke Homepage");
    const designBrief = briefs.find((n) => n.properties.title === "Smoke brief");
    expect(homepage).toBeTruthy();
    expect(designBrief).toBeTruthy();

    const link = await executeAction(ports, {
      actionType: "link_homepage_contains",
      input: {
        sourceNodeId: homepage!.id,
        targetNodeId: designBrief!.id,
      },
      executorId: smokeUserId,
      executorType: "Agent",
      projectId,
    });
    expect(link.status).toBe("committed");

    const instructions = await ports.catalog.findInstructions("homepage", undefined, 5);
    expect(
      instructions.some((i) => i.title === "Homepage creation workflow"),
    ).toBe(true);
  });
});
