import { describe, expect, it } from "vitest";
import { executeAction } from "./index.js";
import {
  createInMemoryPorts,
  createInMemoryState,
  seedTestCatalog,
  TEST_PROJECT_ID,
} from "./testing/in-memory.js";
import type { Workflow } from "./domain/types.js";
import { parseWorkflowSpec } from "@ssota/contracts";

function seedWorkflow(
  state: ReturnType<typeof createInMemoryState>,
  workflowKey: string,
): void {
  const workflow: Workflow = {
    id: "00000000-0000-4000-8000-000000000099",
    projectId: TEST_PROJECT_ID,
    slug: workflowKey,
    workflowKey,
    lifecycle: "Active",
    scope: { kind: "global" },
    spec: parseWorkflowSpec({
      title: "Document creation",
      workflowKey,
      lifecycle: "Active",
      scope: { kind: "global" },
      steps: [{ id: "step_1", title: "Create", mode: "agentic", actions: [] }],
    }),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  state.workflows.push(workflow);
}

describe("update_task", () => {
  it("commits a status change and action log entry", async () => {
    const state = createInMemoryState();
    seedTestCatalog(state);
    seedWorkflow(state, "document_creation");
    const ports = createInMemoryPorts(state);

    const spawn = await executeAction(ports, {
      projectId: TEST_PROJECT_ID,
      actionType: "spawn_task",
      input: {
        title: "Move me on the board",
        workflowKey: "document_creation",
      },
      executorId: "agent-1",
      executorType: "Agent",
    });
    expect(spawn.status).toBe("committed");
    if (spawn.status !== "committed") return;

    const [task] = await ports.tasks.listTasks();
    expect(task?.status).toBe("pending");

    const update = await executeAction(ports, {
      projectId: TEST_PROJECT_ID,
      actionType: "update_task",
      input: {
        taskId: task!.id,
        status: "running",
      },
      executorId: "human-1",
      executorType: "Human",
    });
    expect(update.status).toBe("committed");

    const refreshed = await ports.tasks.getTask(task!.id);
    expect(refreshed?.status).toBe("running");
  });

  it("rejects update_task when task does not exist", async () => {
    const state = createInMemoryState();
    seedTestCatalog(state);
    const ports = createInMemoryPorts(state);

    const result = await executeAction(ports, {
      projectId: TEST_PROJECT_ID,
      actionType: "update_task",
      input: {
        taskId: "00000000-0000-4000-8000-000000000001",
        status: "done",
      },
      executorId: "agent-1",
      executorType: "Agent",
    });

    expect(result.status).toBe("rejected");
    if (result.status !== "rejected") return;
    expect(result.code).toBe("PRECONDITION_FAILED");
  });

  it("rejects update_task with empty patch", async () => {
    const state = createInMemoryState();
    seedTestCatalog(state);
    seedWorkflow(state, "document_creation");
    const ports = createInMemoryPorts(state);

    const spawn = await executeAction(ports, {
      projectId: TEST_PROJECT_ID,
      actionType: "spawn_task",
      input: {
        title: "No-op task",
        workflowKey: "document_creation",
      },
      executorId: "agent-1",
      executorType: "Agent",
    });
    expect(spawn.status).toBe("committed");
    if (spawn.status !== "committed") return;

    const [task] = await ports.tasks.listTasks();
    const result = await executeAction(ports, {
      projectId: TEST_PROJECT_ID,
      actionType: "update_task",
      input: {
        taskId: task!.id,
      },
      executorId: "agent-1",
      executorType: "Agent",
    });

    expect(result.status).toBe("rejected");
    if (result.status !== "rejected") return;
    expect(result.code).toBe("PRECONDITION_FAILED");
  });
});
