import { randomUUID } from "node:crypto";
import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import { createNode, spawnTask, updateTask } from "@ssota/core";
import { textToBlockNoteContent } from "@ssota/contracts";
import {
  createConsolePort,
  createDb,
  createGraphPorts,
  createTaskPort,
  createWorkflowInstructionPort,
  DEFAULT_ORG_SLUG,
  DEFAULT_PROJECT_SLUG,
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
  let projectId: string;
  let otherProjectId: string;
  let taskPort: ReturnType<typeof createTaskPort>;
  let graphPorts: ReturnType<typeof createGraphPorts>;
  let workflowInstructions: ReturnType<typeof createWorkflowInstructionPort>;
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
      const project = await consolePort.getProjectBySlug(org.id, DEFAULT_PROJECT_SLUG);
      if (!project) {
        skip = true;
        return;
      }
      projectId = project.id;
      taskPort = createTaskPort(dbBundle.db, { projectId });
      graphPorts = createGraphPorts(dbBundle.db, { projectId });
      workflowInstructions = createWorkflowInstructionPort(dbBundle.db, {
        projectId,
      });

      // Projects start with no DB workflow_instructions rows by design
      // (WORKFLOW_INSTRUCTION_SEEDS is empty; agents author them on demand).
      // Seed the keys this suite spawns tasks with so it is self-contained.
      for (const key of [
        "work.implement_feature",
        "work.write_document",
        "orchestrator.daily",
      ]) {
        await workflowInstructions.upsertInstruction({
          key,
          name: key,
          description: `Integration fixture for ${key}`,
          content: textToBlockNoteContent(`Fixture instruction for ${key}.`),
        });
      }

      const [other] = await dbBundle.db
        .insert(schema.projects)
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
      workflowInstructions,
    };
  }

  it("spawnTask persists task with workflow instruction defaults", async () => {
    const task = await spawnTask(spawnDeps(), projectId, {
      title: `Integration ${randomUUID()}`,
      workflowInstructionKey: "work.implement_feature",
      context: { executionDirective: sampleExecutionDirective },
      acceptanceCriteria: ["Task completed"],
    });
    expect(task.id).toBeTruthy();
    expect(task.status).toBe("pending");
    expect(task.workflowInstructionKey).toBe("work.implement_feature");
  });

  it("spawnTask dedupes by idempotencyKey", async () => {
    const key = `integration:${randomUUID()}`;
    const first = await spawnTask(spawnDeps(), projectId, {
      title: "First",
      workflowInstructionKey: "orchestrator.daily",
      context: { executionDirective: sampleExecutionDirective },
      acceptanceCriteria: ["done"],
      idempotencyKey: key,
    });
    const second = await spawnTask(spawnDeps(), projectId, {
      title: "Second",
      workflowInstructionKey: "orchestrator.daily",
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
        projectId,
        catalogKey: "feature",
        title: `Feature ${randomUUID()}`,
        properties: {},
      },
    );

    const task = await spawnTask(spawnDeps(), projectId, {
      title: "Linked task",
      workflowInstructionKey: "work.implement_feature",
      targetNodeId: node.id,
      context: { executionDirective: sampleExecutionDirective },
      acceptanceCriteria: ["done"],
    });
    expect(task.targetNodeId).toBe(node.id);
  });

  it("updateTask patches status and result", async () => {
    const created = await spawnTask(spawnDeps(), projectId, {
      title: `Patch ${randomUUID()}`,
      workflowInstructionKey: "work.write_document",
      context: { executionDirective: sampleExecutionDirective },
      acceptanceCriteria: ["document updated"],
    });

    const updated = await updateTask({ tasks: taskPort }, projectId, {
      taskId: created.id,
      status: "running",
      result: { step: "drafting" },
    });
    expect(updated.status).toBe("running");

    const done = await updateTask({ tasks: taskPort }, projectId, {
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
        projectId,
        catalogKey: "initiative",
        title: `Initiative ${randomUUID()}`,
        properties: {},
      },
    );

    await spawnTask(spawnDeps(), projectId, {
      title: "Filtered",
      workflowInstructionKey: "work.implement_feature",
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
