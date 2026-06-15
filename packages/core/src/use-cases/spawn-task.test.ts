import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  createInMemoryGraphReadPort,
  createInMemoryGraphStore,
} from "../testing/in-memory-graph.js";
import {
  createInMemoryState,
  createInMemoryPorts,
  TEST_PROJECT_ID,
} from "../testing/in-memory.js";
import { spawnTask } from "./spawn-task.js";
import { updateTask } from "./update-task.js";

const PROJECT_ID = TEST_PROJECT_ID;
const OTHER_PROJECT_ID = "00000000-0000-4000-8000-000000000099";

describe("spawnTask", () => {
  it("creates a task for a known workflow key", async () => {
    const state = createInMemoryState();
    const { tasks } = createInMemoryPorts(state, { projectId: PROJECT_ID });

    const task = await spawnTask({ tasks }, PROJECT_ID, {
      title: "Daily planning",
      workflowKey: "orchestrator.daily",
    });

    expect(task.workflowKey).toBe("orchestrator.daily");
    expect(task.status).toBe("ready");
    expect(task.projectId).toBe(PROJECT_ID);
  });

  it("rejects unknown workflow keys", async () => {
    const state = createInMemoryState();
    const { tasks } = createInMemoryPorts(state, { projectId: PROJECT_ID });

    await expect(
      spawnTask({ tasks }, PROJECT_ID, {
        title: "Bad",
        workflowKey: "not.registered",
      }),
    ).rejects.toMatchObject({
      name: "TaskError",
      code: "UNKNOWN_WORKFLOW_KEY",
    });
  });

  it("returns existing task on idempotency key collision", async () => {
    const state = createInMemoryState();
    const { tasks } = createInMemoryPorts(state, { projectId: PROJECT_ID });

    const first = await spawnTask({ tasks }, PROJECT_ID, {
      title: "Work item",
      workflowKey: "work.implement_feature",
      idempotencyKey: "daily:2026-06-15:feature-a",
    });
    const second = await spawnTask({ tasks }, PROJECT_ID, {
      title: "Different title",
      workflowKey: "work.implement_feature",
      idempotencyKey: "daily:2026-06-15:feature-a",
    });

    expect(second.id).toBe(first.id);
    expect(second.title).toBe("Work item");
  });

  it("rejects targetNodeId from another project", async () => {
    const graphStore = createInMemoryGraphStore();
    const graphRead = createInMemoryGraphReadPort(graphStore);
    const nodeId = randomUUID();
    graphStore.nodes.set(nodeId, {
      id: nodeId,
      projectId: OTHER_PROJECT_ID,
      nodeType: "feature",
      title: "Other",
      properties: {},
      content: null,
      lifecycleStatus: "Active",
      schemaVersion: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const state = createInMemoryState();
    const { tasks } = createInMemoryPorts(state, { projectId: PROJECT_ID });

    await expect(
      spawnTask({ tasks, graphRead }, PROJECT_ID, {
        title: "Linked work",
        workflowKey: "work.implement_feature",
        targetNodeId: nodeId,
      }),
    ).rejects.toMatchObject({
      name: "GraphError",
      code: "PROJECT_MISMATCH",
    });
  });
});

describe("spawnTask dependencies", () => {
  it("forces pending when blockers are open", async () => {
    const state = createInMemoryState();
    const { tasks } = createInMemoryPorts(state, { projectId: PROJECT_ID });
    const blocker = await spawnTask({ tasks }, PROJECT_ID, {
      title: "Blocker",
      workflowKey: "orchestrator.daily",
    });

    const blocked = await spawnTask({ tasks }, PROJECT_ID, {
      title: "Blocked work",
      workflowKey: "orchestrator.daily",
      blockedByTaskIds: [blocker.id],
    });

    expect(blocked.status).toBe("pending");
  });

  it("rejects cross-project blocker ids", async () => {
    const graphStore = createInMemoryGraphStore();
    const graphRead = createInMemoryGraphReadPort(graphStore);
    const otherState = createInMemoryState();
    const otherPorts = createInMemoryPorts(otherState, {
      projectId: OTHER_PROJECT_ID,
    });
    const blocker = await spawnTask({ tasks: otherPorts.tasks }, OTHER_PROJECT_ID, {
      title: "Other project blocker",
      workflowKey: "work.implement_feature",
    });

    const state = createInMemoryState();
    const { tasks } = createInMemoryPorts(state, { projectId: PROJECT_ID });

    await expect(
      spawnTask({ tasks, graphRead }, PROJECT_ID, {
        title: "Blocked",
        workflowKey: "work.implement_feature",
        blockedByTaskIds: [blocker.id],
      }),
    ).rejects.toMatchObject({
      name: "TaskError",
      code: "INVALID_DEPENDENCY",
    });
  });
});

describe("updateTask", () => {
  it("updates task status and sets completedAt on done", async () => {
    const state = createInMemoryState();
    const { tasks } = createInMemoryPorts(state, { projectId: PROJECT_ID });
    const created = await spawnTask({ tasks }, PROJECT_ID, {
      title: "Implement",
      workflowKey: "work.implement_feature",
    });

    const updated = await updateTask({ tasks }, PROJECT_ID, {
      taskId: created.id,
      status: "done",
      result: { summary: "shipped" },
    });

    expect(updated.status).toBe("done");
    expect(updated.completedAt).not.toBeNull();
    expect(updated.result.summary).toBe("shipped");
  });

  it("rejects empty patch", async () => {
    const state = createInMemoryState();
    const { tasks } = createInMemoryPorts(state, { projectId: PROJECT_ID });
    const created = await spawnTask({ tasks }, PROJECT_ID, {
      title: "Implement",
      workflowKey: "work.implement_feature",
    });

    await expect(
      updateTask({ tasks }, PROJECT_ID, { taskId: created.id }),
    ).rejects.toMatchObject({
      name: "TaskError",
      code: "VALIDATION_FAILED",
    });
  });

  it("rejects update for missing task", async () => {
    const state = createInMemoryState();
    const { tasks } = createInMemoryPorts(state, { projectId: PROJECT_ID });

    await expect(
      updateTask({ tasks }, PROJECT_ID, {
        taskId: randomUUID(),
        status: "done",
      }),
    ).rejects.toMatchObject({
      name: "TaskError",
      code: "NOT_FOUND",
    });
  });

  it("rejects ready when open blockers exist", async () => {
    const state = createInMemoryState();
    const { tasks } = createInMemoryPorts(state, { projectId: PROJECT_ID });
    const blocker = await spawnTask({ tasks }, PROJECT_ID, {
      title: "Blocker",
      workflowKey: "work.implement_feature",
    });
    const blocked = await spawnTask({ tasks }, PROJECT_ID, {
      title: "Blocked",
      workflowKey: "work.implement_feature",
      blockedByTaskIds: [blocker.id],
    });

    await expect(
      updateTask({ tasks }, PROJECT_ID, {
        taskId: blocked.id,
        status: "ready",
      }),
    ).rejects.toMatchObject({
      name: "TaskError",
      code: "DEPENDENCY_BLOCKED",
    });
  });

  it("promotes pending dependents when blocker completes", async () => {
    const state = createInMemoryState();
    const { tasks } = createInMemoryPorts(state, { projectId: PROJECT_ID });
    const blocker = await spawnTask({ tasks }, PROJECT_ID, {
      title: "Blocker",
      workflowKey: "work.implement_feature",
    });
    const blocked = await spawnTask({ tasks }, PROJECT_ID, {
      title: "Blocked",
      workflowKey: "work.implement_feature",
      blockedByTaskIds: [blocker.id],
    });

    await updateTask({ tasks }, PROJECT_ID, {
      taskId: blocker.id,
      status: "done",
    });

    const refreshed = await tasks.getTask(blocked.id);
    expect(refreshed?.status).toBe("ready");
  });
});
