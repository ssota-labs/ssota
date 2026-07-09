import { randomUUID } from "node:crypto";
import type {
  PortScope,
  Task,
  TaskPort,
  TaskQueryInput,
} from "../domain/types.js";
import type { AgentDefinitionReadPort } from "../ports/agent-definition-port.js";
import type { AgentDefinition } from "@ssota/contracts";
import { BUILTIN_AGENT_IDS } from "@ssota/contracts/agents";

export const TEST_PROJECT_ID = "00000000-0000-4000-8000-000000000001";

/**
 * spawn-task.test.ts용 최소 in-memory 상태.
 * 과거 legacy CatalogPort/Gate/Commit/ImpactQueue 어댑터는 제거됨(ARCH-03) — task 포트만 유지한다.
 */
export interface InMemoryState {
  tasks: Map<string, Task>;
}

export function createInMemoryState(): InMemoryState {
  return { tasks: new Map() };
}

export function createInMemoryPorts(
  state: InMemoryState,
  scope?: PortScope,
): { tasks: TaskPort } {
  const teamspaceId = scope?.teamspaceId ?? TEST_PROJECT_ID;
  return { tasks: createInMemoryTaskPort(state, teamspaceId) };
}

function createInMemoryTaskPort(
  state: InMemoryState,
  teamspaceId: string,
): TaskPort {
  function queryItems(params?: TaskQueryInput): Task[] {
    let items = [...state.tasks.values()].filter(
      (task) => task.teamspaceId === teamspaceId,
    );
    if (params?.status) {
      items = items.filter((task) => task.status === params.status);
    }
    if (params?.agentDefinitionId) {
      items = items.filter(
        (task) => task.agentDefinitionId === params.agentDefinitionId,
      );
    }
    if (params?.assignee) {
      items = items.filter((task) => task.assignee === params.assignee);
    }
    if (params?.subjectId) {
      items = items.filter((task) => task.subjectId === params.subjectId);
    }
    if (params?.targetNodeId) {
      items = items.filter((task) => task.targetNodeId === params.targetNodeId);
    }
    if (params?.executorType) {
      items = items.filter((task) => task.executorType === params.executorType);
    }
    items.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    const offset = params?.offset ?? 0;
    const limit = params?.limit ?? 20;
    return items.slice(offset, offset + limit);
  }

  return {
    async listTasks(params) {
      return queryItems({ limit: params?.limit ?? 20, offset: 0 });
    },
    async queryTasks(params) {
      return queryItems(params);
    },
    async getTask(taskId) {
      const task = state.tasks.get(taskId);
      return task?.teamspaceId === teamspaceId ? task : null;
    },
    async getTaskByIdempotencyKey(idempotencyKey) {
      for (const task of state.tasks.values()) {
        if (
          task.teamspaceId === teamspaceId &&
          task.idempotencyKey === idempotencyKey
        ) {
          return task;
        }
      }
      return null;
    },
    async createTask(input) {
      const createdAt = new Date();
      const task: Task = {
        id: randomUUID(),
        teamspaceId,
        agentDefinitionId: input.agentDefinitionId ?? null,
        title: input.title,
        status: input.status ?? "pending",
        executorType: input.executorType ?? "Agent",
        assignee: input.assignee ?? null,
        subjectId: input.subjectId ?? null,
        targetNodeId: input.targetNodeId ?? null,
        parentTaskId: input.parentTaskId ?? null,
        sourceActionLogId: null,
        context: input.context ?? {},
        acceptanceCriteria: input.acceptanceCriteria ?? [],
        idempotencyKey: input.idempotencyKey ?? null,
        sandboxEnvironmentId: input.sandboxEnvironmentId ?? null,
        result: {},
        completedAt: null,
        createdAt,
        updatedAt: createdAt,
      };
      state.tasks.set(task.id, task);
      return task;
    },
    async updateTask(taskId, patch) {
      const existing = state.tasks.get(taskId);
      if (!existing || existing.teamspaceId !== teamspaceId) return null;
      const updated: Task = {
        ...existing,
        ...patch,
        completedAt:
          patch.status === "done"
            ? new Date()
            : patch.status !== undefined
              ? null
              : existing.completedAt,
        updatedAt: new Date(),
      };
      state.tasks.set(taskId, updated);
      return updated;
    },
  };
}

const TEST_AGENT_DEFINITIONS = [
  {
    id: BUILTIN_AGENT_IDS.implementFeature,
    name: "Implement feature",
  },
  {
    id: BUILTIN_AGENT_IDS.writeDocument,
    name: "Write document",
  },
];

export function createInMemoryAgentDefinitionPort(
  teamspaceId: string = TEST_PROJECT_ID,
): AgentDefinitionReadPort {
  const rows = new Map<string, AgentDefinition>(
    TEST_AGENT_DEFINITIONS.map((meta) => [
      meta.id,
      {
        id: meta.id,
        teamspaceId,
        accountId: null,
        name: meta.name,
        description: "",
        instructions: [{ type: "paragraph", content: [{ type: "text", text: meta.name }] }],
        toolBundles: [],
        nodeScopes: [],
        runPolicy: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]),
  );

  return {
    async listDefinitions() {
      return [...rows.values()].map(({ id, name, description }) => ({
        id,
        name,
        description,
      }));
    },
    async getById(id) {
      return rows.get(id) ?? null;
    },
  };
}

/** @deprecated Use createInMemoryAgentDefinitionPort */
export const createInMemoryWorkflowInstructionPort = createInMemoryAgentDefinitionPort;

export const sampleExecutionDirective = {
  goal: "Complete the seeded test task with verifiable output.",
  background: "Spawned from unit test fixture for agent definition migration.",
  steps: ["Read task context", "Perform work", "Mark done"],
  constraints: ["Do not modify unrelated tasks"],
  contextRefs: { nodeIds: [], edgeIds: [], taskIds: [] },
};
