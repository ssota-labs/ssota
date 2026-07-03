import { randomUUID } from "node:crypto";
import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import { createNode, spawnTask, updateTask } from "@ssota/core";
import { textToBlockNoteContent } from "@ssota/contracts";
import { BUILTIN_AGENT_IDS } from "@ssota/contracts/agents";
import {
  createConsolePort,
  createDb,
  createGraphPorts,
  createTaskPort,
  createAgentDefinitionPort,
  DEFAULT_ORG_SLUG,
  DEFAULT_TEAMSPACE_SLUG,
} from "../src/index.js";
import * as schema from "../src/db/schema.js";

let skip = false;

const sampleExecutionDirective = {
  goal: "Complete the integration test task successfully.",
  background: "Spawned from adapter task-port integration test fixture.",
  steps: ["Read acceptance criteria", "Perform work", "Mark task done"],
  constraints: [],
  contextRefs: { nodeIds: [], edgeIds: [], taskIds: [] },
};

describe("task port integration", () => {
  let teamspaceId: string;
  let otherProjectId: string;
  let taskPort: ReturnType<typeof createTaskPort>;
  let graphPorts: ReturnType<typeof createGraphPorts>;
  let agentDefinitions: ReturnType<typeof createAgentDefinitionPort>;
  let client: ReturnType<typeof createDb>["client"] | undefined;

  beforeAll(async () => {
    try {
      const dbBundle = createDb();
      client = dbBundle.client;
      const consolePort = createConsolePort(dbBundle.db);
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
      taskPort = createTaskPort(dbBundle.db, { teamspaceId });
      graphPorts = createGraphPorts(dbBundle.db, {
        organizationId: org.id,
        teamspaceId,
      });
      agentDefinitions = createAgentDefinitionPort(dbBundle.db, {
        teamspaceId,
      });

      const fixtures: Array<{
        id: string;
        name: string;
      }> = [
        {
          id: BUILTIN_AGENT_IDS.implementFeature,
          name: "Implement feature",
        },
        {
          id: BUILTIN_AGENT_IDS.writeDocument,
          name: "Write document",
        },
      ];

      for (const fixture of fixtures) {
        await agentDefinitions.upsertDefinition({
          id: fixture.id,
          name: fixture.name,
          description: `Integration fixture for ${fixture.name}`,
          instructions: textToBlockNoteContent(
            `Fixture instruction for ${fixture.name}.`,
          ),
          toolBundles: [],
          nodeScopes: [],
          runPolicy: {},
        });
      }

      const [other] = await dbBundle.db
        .insert(schema.teamspaces)
        .values({
          organizationId: org.id,
          slug: `task-test-${randomUUID().slice(0, 8)}`,
          name: "Task Test Other",
        })
        .returning();
      otherProjectId = other!.id;
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

  function spawnDeps() {
    return {
      tasks: taskPort,
      graphRead: graphPorts.graphRead,
      agentDefinitions,
    };
  }

  it("spawnTask persists task with agent definition defaults", async () => {
    const task = await spawnTask(spawnDeps(), teamspaceId, {
      title: `Integration ${randomUUID()}`,
      agentDefinitionId: BUILTIN_AGENT_IDS.implementFeature,
      context: { executionDirective: sampleExecutionDirective },
      acceptanceCriteria: ["Task completed"],
    });
    expect(task.id).toBeTruthy();
    expect(task.status).toBe("pending");
    expect(task.agentDefinitionId).toBe(BUILTIN_AGENT_IDS.implementFeature);
  });

  it("spawnTask dedupes by idempotencyKey", async () => {
    const key = `integration:${randomUUID()}`;
    const first = await spawnTask(spawnDeps(), teamspaceId, {
      title: "First",
      agentDefinitionId: BUILTIN_AGENT_IDS.main,
      context: { executionDirective: sampleExecutionDirective },
      acceptanceCriteria: ["done"],
      idempotencyKey: key,
    });
    const second = await spawnTask(spawnDeps(), teamspaceId, {
      title: "Second",
      agentDefinitionId: BUILTIN_AGENT_IDS.main,
      context: { executionDirective: sampleExecutionDirective },
      acceptanceCriteria: ["done"],
      idempotencyKey: key,
    });
    expect(second.id).toBe(first.id);
  });

  it("spawnTask links targetNodeId in same project", async () => {
    const node = await createNode(
      { catalog: graphPorts.catalog, graphWrite: graphPorts.graphWrite },
      {
        teamspaceId,
        catalogKey: "feature",
        title: `Feature ${randomUUID()}`,
        properties: {},
      },
    );

    const task = await spawnTask(spawnDeps(), teamspaceId, {
      title: "Linked task",
      agentDefinitionId: BUILTIN_AGENT_IDS.implementFeature,
      targetNodeId: node.id,
      context: { executionDirective: sampleExecutionDirective },
      acceptanceCriteria: ["done"],
    });
    expect(task.targetNodeId).toBe(node.id);
  });

  it("updateTask patches status and result", async () => {
    const created = await spawnTask(spawnDeps(), teamspaceId, {
      title: `Patch ${randomUUID()}`,
      agentDefinitionId: BUILTIN_AGENT_IDS.writeDocument,
      context: { executionDirective: sampleExecutionDirective },
      acceptanceCriteria: ["document updated"],
    });

    const updated = await updateTask({ tasks: taskPort }, teamspaceId, {
      taskId: created.id,
      status: "running",
      result: { step: "drafting" },
    });
    expect(updated.status).toBe("running");

    const done = await updateTask({ tasks: taskPort }, teamspaceId, {
      taskId: created.id,
      status: "done",
    });
    expect(done.status).toBe("done");
    expect(done.completedAt).not.toBeNull();
  });

  it("queryTasks filters by targetNodeId", async () => {
    const node = await createNode(
      { catalog: graphPorts.catalog, graphWrite: graphPorts.graphWrite },
      {
        teamspaceId,
        catalogKey: "initiative",
        title: `Initiative ${randomUUID()}`,
        properties: {},
      },
    );

    await spawnTask(spawnDeps(), teamspaceId, {
      title: "Filtered",
      agentDefinitionId: BUILTIN_AGENT_IDS.implementFeature,
      targetNodeId: node.id,
      context: { executionDirective: sampleExecutionDirective },
      acceptanceCriteria: ["done"],
    });

    const matches = await taskPort.queryTasks({
      targetNodeId: node.id,
      limit: 10,
    });
    expect(matches.some((task) => task.targetNodeId === node.id)).toBe(true);
  });
});
