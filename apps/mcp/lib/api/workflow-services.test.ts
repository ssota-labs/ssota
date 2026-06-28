import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import {
  createConsolePort,
  createDb,
  createWorkflowInstructionPort,
  DEFAULT_ORG_SLUG,
  DEFAULT_TEAMSPACE_SLUG,
} from "@ssota/adapter-postgres";
import {
  getWorkflowForMcp,
  getWorkflowInstructionForMcp,
  listWorkflowsForMcp,
} from "./workflow-services";

let skip = false;

describe("workflow-services", () => {
  let db: ReturnType<typeof createDb>["db"];
  let teamspaceId: string;
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
      const project = await consolePort.getTeamspaceBySlug(org.id, DEFAULT_TEAMSPACE_SLUG);
      if (!project) {
        skip = true;
        return;
      }
      teamspaceId = project.id;
      await createWorkflowInstructionPort(db, { teamspaceId }).listInstructions();
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

  it("lists workflow instructions without bodies (incl. code built-ins)", async () => {
    const result = await listWorkflowsForMcp(db, teamspaceId);
    // Nothing is seeded; the agent.setup built-in is always present.
    expect(result.workflows.some((w) => w.key === "agent.setup")).toBe(true);
    for (const workflow of result.workflows) {
      expect(workflow).not.toHaveProperty("content");
      expect(workflow.name.length).toBeGreaterThan(0);
    }
  });

  it("returns workflow instruction metadata by key (built-in)", async () => {
    const workflow = await getWorkflowForMcp(db, teamspaceId, "agent.setup");
    expect(workflow?.key).toBe("agent.setup");
    expect(workflow).not.toHaveProperty("content");
  });

  it("returns null for unknown workflow keys", async () => {
    expect(await getWorkflowForMcp(db, teamspaceId, "not.a.workflow")).toBeNull();
    expect(
      await getWorkflowInstructionForMcp(db, teamspaceId, "not.a.workflow"),
    ).toBeNull();
  });

  it("returns instruction body by key (built-in)", async () => {
    const result = await getWorkflowInstructionForMcp(
      db,
      teamspaceId,
      "agent.setup",
    );
    expect(result?.workflowKey).toBe("agent.setup");
    expect(result?.instruction).toContain("write_workflow_instruction");
    expect(result?.instruction.length).toBeGreaterThan(50);
  });
});
