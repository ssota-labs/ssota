import { and, desc, eq } from "drizzle-orm";
import type {
  ActionPortsScope,
  Task,
  TaskCreateInput,
  TaskPort,
  TaskQueryInput,
  TaskUpdatePatch,
} from "@ssota/core";
import type { Db } from "../db/client.js";
import * as schema from "../db/schema.js";

export type { ActionPortsScope };
export { createConsolePort } from "./console.js";
export { createOnboardingPort } from "./onboarding.js";
export { createGraphPorts } from "./create-graph-ports.js";
export { createGraphReadPort } from "./graph-read-port.js";
export { createGraphWritePort } from "./graph-write-port.js";

function mapTask(row: typeof schema.tasks.$inferSelect): Task {
  return {
    id: row.id,
    projectId: row.projectId,
    workflowKey: row.workflowKey,
    workflowId: null,
    title: row.title,
    status: row.status,
    executorType: row.executorType,
    assignee: row.assignee,
    subjectId: row.subjectId,
    targetNodeId: null,
    parentTaskId: row.parentTaskId,
    sourceActionLogId: null,
    context: row.context,
    acceptanceCriteria: row.acceptanceCriteria,
    idempotencyKey: row.idempotencyKey,
    result: row.result,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createTaskPort(db: Db, scope: ActionPortsScope): TaskPort {
  const { projectId } = scope;

  function buildQuery(params?: TaskQueryInput) {
    const conditions = [eq(schema.tasks.projectId, projectId)];
    if (params?.status) conditions.push(eq(schema.tasks.status, params.status));
    if (params?.workflowKey) {
      conditions.push(eq(schema.tasks.workflowKey, params.workflowKey));
    }
    if (params?.assignee) conditions.push(eq(schema.tasks.assignee, params.assignee));
    if (params?.subjectId) conditions.push(eq(schema.tasks.subjectId, params.subjectId));
    if (params?.executorType) {
      conditions.push(eq(schema.tasks.executorType, params.executorType));
    }
    return conditions;
  }

  return {
    async listTasks(params) {
      const rows = await db
        .select()
        .from(schema.tasks)
        .where(eq(schema.tasks.projectId, projectId))
        .orderBy(desc(schema.tasks.updatedAt))
        .limit(params?.limit ?? 20);
      return rows.map(mapTask);
    },

    async queryTasks(params) {
      const rows = await db
        .select()
        .from(schema.tasks)
        .where(and(...buildQuery(params)))
        .orderBy(desc(schema.tasks.updatedAt))
        .limit(params?.limit ?? 20)
        .offset(params?.offset ?? 0);
      return rows.map(mapTask);
    },

    async getTask(taskId) {
      const rows = await db
        .select()
        .from(schema.tasks)
        .where(
          and(
            eq(schema.tasks.projectId, projectId),
            eq(schema.tasks.id, taskId),
          ),
        )
        .limit(1);
      return rows[0] ? mapTask(rows[0]) : null;
    },

    async createTask(input: TaskCreateInput) {
      const [row] = await db
        .insert(schema.tasks)
        .values({
          projectId,
          title: input.title,
          workflowKey: input.workflowKey,
          status: input.status ?? "pending",
          executorType: input.executorType ?? "Agent",
          assignee: input.assignee ?? null,
          subjectId: input.subjectId ?? null,
          parentTaskId: input.parentTaskId ?? null,
          context: input.context ?? {},
          acceptanceCriteria: input.acceptanceCriteria ?? [],
          idempotencyKey: input.idempotencyKey ?? null,
        })
        .returning();
      return mapTask(row!);
    },

    async updateTask(taskId: string, patch: TaskUpdatePatch) {
      const now = new Date();
      const set: Partial<typeof schema.tasks.$inferInsert> = {
        updatedAt: now,
      };
      if (patch.title !== undefined) set.title = patch.title;
      if (patch.status !== undefined) {
        set.status = patch.status;
        set.completedAt = patch.status === "done" ? now : null;
      }
      if (patch.assignee !== undefined) set.assignee = patch.assignee;
      if (patch.subjectId !== undefined) set.subjectId = patch.subjectId;
      if (patch.executorType !== undefined) set.executorType = patch.executorType;
      if (patch.context !== undefined) set.context = patch.context;
      if (patch.acceptanceCriteria !== undefined) {
        set.acceptanceCriteria = patch.acceptanceCriteria;
      }
      if (patch.result !== undefined) set.result = patch.result;

      const [row] = await db
        .update(schema.tasks)
        .set(set)
        .where(
          and(
            eq(schema.tasks.projectId, projectId),
            eq(schema.tasks.id, taskId),
          ),
        )
        .returning();
      return row ? mapTask(row) : null;
    },
  };
}
