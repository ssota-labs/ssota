import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { TaskStatus } from "@ssota/contracts";
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
    targetNodeId: row.targetNodeId,
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

function isBlockerTerminal(status: TaskStatus): boolean {
  return status === "done" || status === "cancelled";
}

export function createTaskPort(db: Db, scope: ActionPortsScope): TaskPort {
  const { projectId } = scope;

  async function fetchBlockersForTask(taskId: string): Promise<Task[]> {
    const rows = await db
      .select({ blocker: schema.tasks })
      .from(schema.taskDependencies)
      .innerJoin(
        schema.tasks,
        eq(schema.tasks.id, schema.taskDependencies.blockerTaskId),
      )
      .where(
        and(
          eq(schema.taskDependencies.projectId, projectId),
          eq(schema.taskDependencies.blockedTaskId, taskId),
        ),
      );
    return rows.map((row) => mapTask(row.blocker));
  }

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
    if (params?.targetNodeId) {
      conditions.push(eq(schema.tasks.targetNodeId, params.targetNodeId));
    }
    if (params?.runnable) {
      conditions.push(eq(schema.tasks.status, "ready"));
      conditions.push(
        sql`NOT EXISTS (
          SELECT 1
          FROM task_dependencies d
          INNER JOIN tasks blocker ON blocker.id = d.blocker_task_id
          WHERE d.blocked_task_id = ${schema.tasks.id}
            AND d.project_id = ${projectId}
            AND blocker.status NOT IN ('done', 'cancelled')
        )`,
      );
    }
    return conditions;
  }

  const port: TaskPort = {
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

    async getTaskByIdempotencyKey(idempotencyKey) {
      const rows = await db
        .select()
        .from(schema.tasks)
        .where(
          and(
            eq(schema.tasks.projectId, projectId),
            eq(schema.tasks.idempotencyKey, idempotencyKey),
          ),
        )
        .limit(1);
      return rows[0] ? mapTask(rows[0]) : null;
    },

    async createTask(input: TaskCreateInput, blockedByTaskIds = []) {
      return db.transaction(async (tx) => {
        const [row] = await tx
          .insert(schema.tasks)
          .values({
            projectId,
            title: input.title,
            workflowKey: input.workflowKey,
            status: input.status ?? "pending",
            executorType: input.executorType ?? "Agent",
            assignee: input.assignee ?? null,
            subjectId: input.subjectId ?? null,
            targetNodeId: input.targetNodeId ?? null,
            parentTaskId: input.parentTaskId ?? null,
            context: input.context ?? {},
            acceptanceCriteria: input.acceptanceCriteria ?? [],
            idempotencyKey: input.idempotencyKey ?? null,
          })
          .returning();
        const task = mapTask(row!);

        if (blockedByTaskIds.length > 0) {
          await tx.insert(schema.taskDependencies).values(
            blockedByTaskIds.map((blockerTaskId) => ({
              projectId,
              blockerTaskId,
              blockedTaskId: task.id,
            })),
          );
        }

        return task;
      });
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
      if (patch.targetNodeId !== undefined) set.targetNodeId = patch.targetNodeId;
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

    async getBlockers(taskId) {
      return fetchBlockersForTask(taskId);
    },

    async hasOpenBlockers(taskId) {
      const blockers = await fetchBlockersForTask(taskId);
      return blockers.some((blocker) => !isBlockerTerminal(blocker.status));
    },

    async promoteRunnableDependents(blockerTaskId: string) {
      const rows = await db
        .select({ blocked: schema.tasks })
        .from(schema.taskDependencies)
        .innerJoin(
          schema.tasks,
          eq(schema.tasks.id, schema.taskDependencies.blockedTaskId),
        )
        .where(
          and(
            eq(schema.taskDependencies.projectId, projectId),
            eq(schema.taskDependencies.blockerTaskId, blockerTaskId),
            eq(schema.tasks.status, "pending"),
          ),
        );

      const promoted: Task[] = [];
      for (const row of rows) {
        const open = await port.hasOpenBlockers(row.blocked.id);
        if (!open) {
          const updated = await port.updateTask(row.blocked.id, { status: "ready" });
          if (updated) promoted.push(updated);
        }
      }
      return promoted;
    },

    async listBlockersByBlockedTaskIds(blockedTaskIds) {
      const map = new Map<string, Task[]>();
      if (blockedTaskIds.length === 0) return map;

      const rows = await db
        .select({
          blockedTaskId: schema.taskDependencies.blockedTaskId,
          blocker: schema.tasks,
        })
        .from(schema.taskDependencies)
        .innerJoin(
          schema.tasks,
          eq(schema.tasks.id, schema.taskDependencies.blockerTaskId),
        )
        .where(
          and(
            eq(schema.taskDependencies.projectId, projectId),
            inArray(schema.taskDependencies.blockedTaskId, blockedTaskIds),
          ),
        );

      for (const row of rows) {
        const blockers = map.get(row.blockedTaskId) ?? [];
        blockers.push(mapTask(row.blocker));
        map.set(row.blockedTaskId, blockers);
      }
      return map;
    },
  };

  return port;
}
