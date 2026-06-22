import { randomUUID } from "node:crypto";
import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import { createNode, spawnTask, updateTask } from "@ssota/core";
import {
  createConsolePort,
  createDb,
  createGraphPorts,
  createTaskPort,
  DEFAULT_ORG_SLUG,
  DEFAULT_PROJECT_SLUG,
} from "../src/index.js";
import * as schema from "../src/db/schema.js";

let skip = false;

describe("task port integration", () => {
  let projectId: string;
  let otherProjectId: string;
  let taskPort: ReturnType<typeof createTaskPort>;
  let graphPorts: ReturnType<typeof createGraphPorts>;
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

  it("spawnTask persists task with workflow defaults", async () => {
    const task = await spawnTask(
      { tasks: taskPort, graphRead: graphPorts.graphRead },
      projectId,
      {
        title: `Integration ${randomUUID()}`,
        workflowKey: "work.implement_feature",
      },
    );
    expect(task.id).toBeTruthy();
    expect(task.status).toBe("pending");
    expect(task.workflowKey).toBe("work.implement_feature");
  });

  it("spawnTask dedupes by idempotencyKey", async () => {
    const key = `integration:${randomUUID()}`;
    const first = await spawnTask({ tasks: taskPort }, projectId, {
      title: "First",
      workflowKey: "orchestrator.daily",
      idempotencyKey: key,
    });
    const second = await spawnTask({ tasks: taskPort }, projectId, {
      title: "Second",
      workflowKey: "orchestrator.daily",
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

    const task = await spawnTask(
      { tasks: taskPort, graphRead: graphPorts.graphRead },
      projectId,
      {
        title: "Linked task",
        workflowKey: "work.implement_feature",
        targetNodeId: node.id,
      },
    );
    expect(task.targetNodeId).toBe(node.id);
  });

  it("updateTask patches status and result", async () => {
    const created = await spawnTask({ tasks: taskPort }, projectId, {
      title: `Patch ${randomUUID()}`,
      workflowKey: "work.write_document",
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

    await spawnTask(
      { tasks: taskPort, graphRead: graphPorts.graphRead },
      projectId,
      {
        title: "Filtered",
        workflowKey: "work.implement_feature",
        targetNodeId: node.id,
      },
    );

    const matches = await taskPort.queryTasks({
      targetNodeId: node.id,
      limit: 10,
    });
    expect(matches.some((task) => task.targetNodeId === node.id)).toBe(true);
  });
});
