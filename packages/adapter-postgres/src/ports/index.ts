import { and, desc, eq, isNull, or, type SQL } from "drizzle-orm";
import type {
  PortScope,
  Task,
  TaskCreateInput,
  TaskPort,
  TaskQueryInput,
  TaskUpdatePatch,
} from "@ssota/core";
import type { Db } from "../db/client.js";
import * as schema from "../db/schema.js";

export type { PortScope };
export { createConsolePort } from "./platform/console.js";
export { createOnboardingPort } from "./platform/onboarding.js";
export { createGraphPorts } from "./ontology/create-graph-ports.js";
export { createGraphReadPort } from "./ontology/graph-read-port.js";
export { createGraphWritePort } from "./ontology/graph-write-port.js";
export {
  createAgentDefinitionPort,
  seedAgentDefinitions,
  createWorkflowInstructionPort,
  seedWorkflowInstructions,
} from "./agents/agent-definition-port.js";
export {
  createTeamspaceMainConfigPort,
  seedTeamspaceMainConfig,
} from "./agents/teamspace-main-config-port.js";
export { createWorkerPort, createScriptToolPort, listBuilderWorkersByKind } from "./ontology/worker-port.js";
export { createSkillPort } from "./agents/skill-port.js";
export {
  createSandboxEnvironmentPort,
  createSandboxSessionRecordPort,
} from "./shared/sandbox-environment-port.js";
export { createPagePort, seedPages } from "./ontology/page-port.js";
export { createPageViewStatePort } from "./ontology/page-view-state-port.js";
export { seedWorkCycleAndGatePolicies } from "./ontology/seed-work-cycles.js";
export {
  applyTemplate,
  BUILTIN_TEMPLATES,
  getTemplateBundleById,
  EMPTY_TEMPLATE,
  SOFTWARE_DEV_TEMPLATE,
  FINANCE_TEMPLATE,
} from "./templates.js";
export { seedFinanceDemo } from "./seed-finance-demo.js";

function mapTask(row: typeof schema.tasks.$inferSelect): Task {
  return {
    id: row.id,
    teamspaceId: row.teamspaceId,
    agentDefinitionId: row.agentDefinitionId,
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
    sandboxEnvironmentId: row.sandboxEnvironmentId ?? null,
    result: row.result,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createTaskPort(db: Db, scope: PortScope): TaskPort {
  const { teamspaceId, accountId } = scope;
  const accountIdValue = accountId ?? null;
  const taskAccountConds = (): SQL[] =>
    accountId
      ? [
          or(
            isNull(schema.tasks.accountId),
            eq(schema.tasks.accountId, accountId),
          )!,
        ]
      : [];

  function buildQuery(params?: TaskQueryInput) {
    const conditions = [
      eq(schema.tasks.teamspaceId, teamspaceId),
      ...taskAccountConds(),
    ];
    if (params?.status) conditions.push(eq(schema.tasks.status, params.status));
    if (params?.agentDefinitionId) {
      conditions.push(
        eq(schema.tasks.agentDefinitionId, params.agentDefinitionId),
      );
    }
    if (params?.assignee) conditions.push(eq(schema.tasks.assignee, params.assignee));
    if (params?.subjectId) conditions.push(eq(schema.tasks.subjectId, params.subjectId));
    if (params?.executorType) {
      conditions.push(eq(schema.tasks.executorType, params.executorType));
    }
    if (params?.targetNodeId) {
      conditions.push(eq(schema.tasks.targetNodeId, params.targetNodeId));
    }
    return conditions;
  }

  return {
    async listTasks(params) {
      const rows = await db
        .select()
        .from(schema.tasks)
        .where(and(eq(schema.tasks.teamspaceId, teamspaceId), ...taskAccountConds()))
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
            eq(schema.tasks.teamspaceId, teamspaceId),
            eq(schema.tasks.id, taskId),
            ...taskAccountConds(),
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
            eq(schema.tasks.teamspaceId, teamspaceId),
            eq(schema.tasks.idempotencyKey, idempotencyKey),
          ),
        )
        .limit(1);
      return rows[0] ? mapTask(rows[0]) : null;
    },

    async createTask(input: TaskCreateInput) {
      const [row] = await db
        .insert(schema.tasks)
        .values({
          teamspaceId,
          accountId: accountIdValue,
          title: input.title,
          agentDefinitionId: input.agentDefinitionId ?? null,
          status: input.status ?? "pending",
          executorType: input.executorType ?? "Agent",
          assignee: input.assignee ?? null,
          subjectId: input.subjectId ?? null,
          targetNodeId: input.targetNodeId ?? null,
          parentTaskId: input.parentTaskId ?? null,
          context: input.context ?? {},
          acceptanceCriteria: input.acceptanceCriteria ?? [],
          idempotencyKey: input.idempotencyKey ?? null,
          sandboxEnvironmentId: input.sandboxEnvironmentId ?? null,
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
      if (patch.targetNodeId !== undefined) set.targetNodeId = patch.targetNodeId;
      if (patch.executorType !== undefined) set.executorType = patch.executorType;
      if (patch.context !== undefined) set.context = patch.context;
      if (patch.acceptanceCriteria !== undefined) {
        set.acceptanceCriteria = patch.acceptanceCriteria;
      }
      if (patch.result !== undefined) set.result = patch.result;
      if (patch.sandboxEnvironmentId !== undefined) {
        set.sandboxEnvironmentId = patch.sandboxEnvironmentId;
      }

      const [row] = await db
        .update(schema.tasks)
        .set(set)
        .where(
          and(
            eq(schema.tasks.teamspaceId, teamspaceId),
            eq(schema.tasks.id, taskId),
          ),
        )
        .returning();
      return row ? mapTask(row) : null;
    },
  };
}
export { createDbGraphCommitPort } from "./ontology/graph-commit-port.js";
export { createDbActionCatalogPort } from "./ontology/action-catalog-port.js";
export type { DbActionCatalogScope } from "./ontology/action-catalog-port.js";
