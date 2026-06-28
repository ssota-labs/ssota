import { and, desc, eq, isNull } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { schedules } from "../db/schema.js";

export interface ScheduleScope {
  teamspaceId: string;
  accountId?: string | null;
}

export interface ScheduleRecord {
  id: string;
  teamspaceId: string;
  accountId: string | null;
  workflowInstructionId: string;
  cronExpression: string;
  timezone: string;
  enabled: boolean;
  idempotencyPrefix: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScheduleInput {
  workflowInstructionId: string;
  cronExpression: string;
  timezone: string;
  enabled?: boolean;
  idempotencyPrefix?: string;
}

export interface UpdateScheduleInput {
  workflowInstructionId?: string;
  cronExpression?: string;
  timezone?: string;
  enabled?: boolean;
  idempotencyPrefix?: string;
}

type ScheduleRow = typeof schedules.$inferSelect;

function mapSchedule(row: ScheduleRow): ScheduleRecord {
  return {
    id: row.id,
    teamspaceId: row.teamspaceId,
    accountId: row.accountId,
    workflowInstructionId: row.workflowInstructionId,
    cronExpression: row.cronExpression,
    timezone: row.timezone,
    enabled: row.enabled,
    idempotencyPrefix: row.idempotencyPrefix,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function accountCondition(accountId?: string | null) {
  return accountId
    ? eq(schedules.accountId, accountId)
    : isNull(schedules.accountId);
}

/**
 * Teamspace/account-scoped CRUD for user-defined schedules. Self-contained (no
 * core interface) like the agent-run telemetry port — schedules are a thin
 * config row, not a domain aggregate.
 */
export function createSchedulePort(db: Db, scope: ScheduleScope) {
  const { teamspaceId } = scope;
  const accountId = scope.accountId ?? null;
  const scopeCondition = and(
    eq(schedules.teamspaceId, teamspaceId),
    accountCondition(accountId),
  );

  return {
    async list(): Promise<ScheduleRecord[]> {
      const rows = await db
        .select()
        .from(schedules)
        .where(scopeCondition)
        .orderBy(desc(schedules.createdAt));
      return rows.map(mapSchedule);
    },

    async get(id: string): Promise<ScheduleRecord | null> {
      const rows = await db
        .select()
        .from(schedules)
        .where(and(eq(schedules.id, id), scopeCondition))
        .limit(1);
      return rows[0] ? mapSchedule(rows[0]) : null;
    },

    async create(input: CreateScheduleInput): Promise<ScheduleRecord> {
      const [row] = await db
        .insert(schedules)
        .values({
          teamspaceId,
          accountId,
          workflowInstructionId: input.workflowInstructionId,
          cronExpression: input.cronExpression,
          timezone: input.timezone,
          enabled: input.enabled ?? true,
          idempotencyPrefix: input.idempotencyPrefix ?? "",
        })
        .returning();
      return mapSchedule(row!);
    },

    async update(
      id: string,
      patch: UpdateScheduleInput,
    ): Promise<ScheduleRecord | null> {
      const values: Record<string, unknown> = { updatedAt: new Date() };
      if (patch.workflowInstructionId !== undefined)
        values.workflowInstructionId = patch.workflowInstructionId;
      if (patch.cronExpression !== undefined)
        values.cronExpression = patch.cronExpression;
      if (patch.timezone !== undefined) values.timezone = patch.timezone;
      if (patch.enabled !== undefined) values.enabled = patch.enabled;
      if (patch.idempotencyPrefix !== undefined)
        values.idempotencyPrefix = patch.idempotencyPrefix;

      const [row] = await db
        .update(schedules)
        .set(values)
        .where(and(eq(schedules.id, id), scopeCondition))
        .returning();
      return row ? mapSchedule(row) : null;
    },

    async delete(id: string): Promise<boolean> {
      const rows = await db
        .delete(schedules)
        .where(and(eq(schedules.id, id), scopeCondition))
        .returning({ id: schedules.id });
      return rows.length > 0;
    },
  };
}

export type SchedulePort = ReturnType<typeof createSchedulePort>;
