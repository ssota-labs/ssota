import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { BUILTIN_AGENT_IDS } from "@ssota/contracts/agents";
import {
  createInMemoryGraphReadPort,
  createInMemoryGraphStore,
} from "../testing/in-memory-graph.js";
import {
  createInMemoryState,
  createInMemoryPorts,
  createInMemoryAgentDefinitionPort,
  sampleExecutionDirective,
  TEST_PROJECT_ID,
} from "../testing/in-memory.js";
import { spawnTask } from "./spawn-task.js";
import { updateTask } from "./update-task.js";

const PROJECT_ID = TEST_PROJECT_ID;
const OTHER_PROJECT_ID = "00000000-0000-4000-8000-000000000099";

function spawnDeps(state: ReturnType<typeof createInMemoryState>, teamspaceId: string) {
  const { tasks } = createInMemoryPorts(state, { teamspaceId });
  return {
    tasks,
    agentDefinitions: createInMemoryAgentDefinitionPort(teamspaceId),
  };
}

describe("spawnTask", () => {
  it("creates a task for a known agent definition id", async () => {
    const state = createInMemoryState();
    const task = await spawnTask(spawnDeps(state, PROJECT_ID), PROJECT_ID, {
      title: "Daily planning",
      agentDefinitionId: BUILTIN_AGENT_IDS.implementFeature,
      context: { executionDirective: sampleExecutionDirective },
      acceptanceCriteria: ["Task created"],
    });

    expect(task.agentDefinitionId).toBe(BUILTIN_AGENT_IDS.implementFeature);
    expect(task.status).toBe("pending");
    expect(task.teamspaceId).toBe(PROJECT_ID);
  });

  it("rejects unknown agent definition ids", async () => {
    const state = createInMemoryState();

    await expect(
      spawnTask(spawnDeps(state, PROJECT_ID), PROJECT_ID, {
        title: "Bad",
        agentDefinitionId: "00000000-0000-4000-8000-000000000099",
        context: { executionDirective: sampleExecutionDirective },
        acceptanceCriteria: ["x"],
      }),
    ).rejects.toMatchObject({
      name: "TaskError",
      code: "UNKNOWN_AGENT_DEFINITION",
    });
  });

  it("returns existing task on idempotency key collision", async () => {
    const state = createInMemoryState();
    const deps = spawnDeps(state, PROJECT_ID);

    const first = await spawnTask(deps, PROJECT_ID, {
      title: "Work item",
      agentDefinitionId: BUILTIN_AGENT_IDS.implementFeature,
      context: { executionDirective: sampleExecutionDirective },
      acceptanceCriteria: ["done"],
      idempotencyKey: "daily:2026-06-15:feature-a",
    });
    const second = await spawnTask(deps, PROJECT_ID, {
      title: "Different title",
      agentDefinitionId: BUILTIN_AGENT_IDS.implementFeature,
      context: { executionDirective: sampleExecutionDirective },
      acceptanceCriteria: ["done"],
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
      teamspaceId: OTHER_PROJECT_ID,
      nodeCatalogId: "00000000-0000-4000-8000-000000000015",
      catalogKey: "feature",
      catalogLabel: "feature",
      title: "Other",
      properties: { lifecycleStatus: "Active" },
      schemaVersion: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const state = createInMemoryState();
    const deps = { ...spawnDeps(state, PROJECT_ID), graphRead };

    await expect(
      spawnTask(deps, PROJECT_ID, {
        title: "Linked work",
        agentDefinitionId: BUILTIN_AGENT_IDS.implementFeature,
        context: { executionDirective: sampleExecutionDirective },
        acceptanceCriteria: ["done"],
        targetNodeId: nodeId,
      }),
    ).rejects.toMatchObject({
      name: "GraphError",
      code: "ORG_MISMATCH",
    });
  });
});

describe("updateTask", () => {
  it("updates task status and sets completedAt on done", async () => {
    const state = createInMemoryState();
    const deps = spawnDeps(state, PROJECT_ID);
    const created = await spawnTask(deps, PROJECT_ID, {
      title: "Implement",
      agentDefinitionId: BUILTIN_AGENT_IDS.implementFeature,
      context: { executionDirective: sampleExecutionDirective },
      acceptanceCriteria: ["shipped"],
    });

    const updated = await updateTask({ tasks: deps.tasks }, PROJECT_ID, {
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
    const deps = spawnDeps(state, PROJECT_ID);
    const created = await spawnTask(deps, PROJECT_ID, {
      title: "Implement",
      agentDefinitionId: BUILTIN_AGENT_IDS.implementFeature,
      context: { executionDirective: sampleExecutionDirective },
      acceptanceCriteria: ["shipped"],
    });

    await expect(
      updateTask({ tasks: deps.tasks }, PROJECT_ID, { taskId: created.id }),
    ).rejects.toMatchObject({
      name: "TaskError",
      code: "VALIDATION_FAILED",
    });
  });

  it("rejects update for missing task", async () => {
    const state = createInMemoryState();
    const { tasks } = createInMemoryPorts(state, { teamspaceId: PROJECT_ID });

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
});
