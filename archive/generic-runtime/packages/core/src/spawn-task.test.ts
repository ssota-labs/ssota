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

describe("spawn_task", () => {
  it("commits a runtime task and action log entry", async () => {
    const state = createInMemoryState();
    seedTestCatalog(state);
    seedWorkflow(state, "document_creation");
    const ports = createInMemoryPorts(state);

    const result = await executeAction(ports, {
      projectId: TEST_PROJECT_ID,
      actionType: "spawn_task",
      input: {
        title: "Process meeting notes",
        workflowKey: "document_creation",
        assignee: "agent:default",
      },
      executorId: "agent-1",
      executorType: "Agent",
      idempotencyKey: "spawn-task-test-1",
    });

    expect(result.status).toBe("committed");
    if (result.status !== "committed") return;
    const tasks = await ports.tasks.listTasks();
    expect(tasks).toHaveLength(1);
    expect(tasks[0]?.title).toBe("Process meeting notes");
    expect(tasks[0]?.workflowKey).toBe("document_creation");
    expect(tasks[0]?.sourceActionLogId).toBe(result.logId);
  });

  it("rejects spawn_task when workflow key is missing from catalog", async () => {
    const state = createInMemoryState();
    seedTestCatalog(state);
    const ports = createInMemoryPorts(state);

    const result = await executeAction(ports, {
      projectId: TEST_PROJECT_ID,
      actionType: "spawn_task",
      input: {
        title: "Invalid task",
        workflowKey: "missing_workflow",
      },
      executorId: "agent-1",
      executorType: "Agent",
    });

    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.code).toBe("CATALOG_NOT_FOUND");
    }
  });

  it("rejects spawn_task when target node is in a different project", async () => {
    const state = createInMemoryState();
    seedTestCatalog(state);
    seedWorkflow(state, "document_creation");
    const ports = createInMemoryPorts(state);

    state.nodes.set("00000000-0000-4000-8000-0000000000aa", {
      id: "00000000-0000-4000-8000-0000000000aa",
      projectId: "00000000-0000-4000-8000-000000000099",
      nodeType: "Document",
      lifecycleStatus: "Active",
      properties: { title: "Other project doc" },
      content: null,
      contentUrl: null,
      provenance: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await executeAction(ports, {
      projectId: TEST_PROJECT_ID,
      actionType: "spawn_task",
      input: {
        title: "Cross project task",
        workflowKey: "document_creation",
        targetNodeId: "00000000-0000-4000-8000-0000000000aa",
      },
      executorId: "agent-1",
      executorType: "Agent",
    });

    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      // Project-scoped graph.getNode hides cross-project nodes as not found.
      expect(result.code).toBe("PRECONDITION_FAILED");
    }
  });
});
