import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import {
  createConsolePort,
  createDb,
  createWorkflowInstructionPort,
  DEFAULT_ORG_SLUG,
  DEFAULT_PROJECT_SLUG,
} from "@ssota/adapter-postgres";
import {
  getWorkflowForMcp,
  getWorkflowInstructionForMcp,
  listWorkflowsForMcp,
} from "./workflow-services";

let skip = false;

describe("workflow-services", () => {
  let db: ReturnType<typeof createDb>["db"];
  let projectId: string;
  let client: ReturnType<typeof createDb>["client"] | undefined;

  beforeAll(async () => {
    try {
      const dbBundle = createDb();
      db = dbBundle.db;
      client = dbBundle.client;
      const consolePort = createConsolePort(db);
      const org = await consolePort.getOrganizationBySlug(DEFAULT_ORG_SLUG);
      if (!org) {
        skip = true;
        return;
      }
      const project = await consolePort.getProjectBySlug(org.id, DEFAULT_PROJECT_SLUG);
      if (!project) {
        skip = true;
        return;
      }
      projectId = project.id;
      await createWorkflowInstructionPort(db, { projectId }).listInstructions();
    } catch {
      skip = true;
    }
  });

  afterAll(async () => {
    await client?.end();
  });

  beforeEach((context) => {
    if (skip) context.skip();
  });

  it("lists workflow instructions without bodies", async () => {
    const result = await listWorkflowsForMcp(db, projectId);
    expect(result.workflows.length).toBeGreaterThanOrEqual(8);
    expect(result.workflows.some((w) => w.key === "orchestrator.daily")).toBe(true);
    for (const workflow of result.workflows) {
      expect(workflow).not.toHaveProperty("content");
      expect(workflow.name.length).toBeGreaterThan(0);
    }
  });

  it("returns workflow instruction metadata by key", async () => {
    const workflow = await getWorkflowForMcp(db, projectId, "orchestrator.daily");
    expect(workflow?.key).toBe("orchestrator.daily");
    expect(workflow).not.toHaveProperty("content");
  });

  it("returns null for unknown workflow keys", async () => {
    expect(await getWorkflowForMcp(db, projectId, "not.a.workflow")).toBeNull();
    expect(
      await getWorkflowInstructionForMcp(db, projectId, "not.a.workflow"),
    ).toBeNull();
  });

  it("returns instruction body by key", async () => {
    const result = await getWorkflowInstructionForMcp(
      db,
      projectId,
      "orchestrator.daily",
    );
    expect(result?.workflowKey).toBe("orchestrator.daily");
    expect(result?.instruction).toContain("query_tasks");
    expect(result?.instruction.length).toBeGreaterThan(50);
  });
});
