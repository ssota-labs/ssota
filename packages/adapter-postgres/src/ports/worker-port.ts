import { and, eq, isNull } from "drizzle-orm";
import type { ActionPortsScope, WorkerPort } from "@ssota/core";
import {
  CreateWorkerInputSchema,
  UpdateWorkerInputSchema,
  WorkerKindSchema,
  WorkerSchema,
  defaultKindConfigForKind,
  type CreateWorkerInput,
  type UpdateWorkerInput,
  type Worker,
  type WorkerIndex,
  type WorkerKind,
} from "@ssota/contracts";
import type { Db } from "../db/client.js";
import * as schema from "../db/schema.js";

type WorkerRow = typeof schema.workers.$inferSelect;

function mapWorker(row: WorkerRow): Worker {
  return WorkerSchema.parse({
    id: row.id,
    teamspaceId: row.teamspaceId,
    accountId: row.accountId,
    key: row.key,
    name: row.name,
    description: row.description,
    kind: row.kind,
    inputSchema: row.inputSchema,
    outputSchema: row.outputSchema,
    script: row.script,
    runtime: row.runtime,
    kindConfig: row.kindConfig,
    version: row.version,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

function mapIndex(row: WorkerRow): WorkerIndex {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description,
    kind: WorkerKindSchema.parse(row.kind),
    version: row.version,
  };
}

export function createWorkerPort(
  db: Db,
  scope: ActionPortsScope,
): WorkerPort {
  const { teamspaceId } = scope;

  const sharedScope = and(
    eq(schema.workers.teamspaceId, teamspaceId),
    isNull(schema.workers.accountId),
  );

  return {
    async listWorkers(kind?: WorkerKind) {
      const rows = await db
        .select()
        .from(schema.workers)
        .where(
          kind
            ? and(sharedScope, eq(schema.workers.kind, kind))
            : sharedScope,
        );
      return rows.map(mapIndex);
    },

    async getByKey(key) {
      const rows = await db
        .select()
        .from(schema.workers)
        .where(and(sharedScope, eq(schema.workers.key, key)))
        .limit(1);
      return rows[0] ? mapWorker(rows[0]) : null;
    },

    async getById(id) {
      const rows = await db
        .select()
        .from(schema.workers)
        .where(and(sharedScope, eq(schema.workers.id, id)))
        .limit(1);
      return rows[0] ? mapWorker(rows[0]) : null;
    },

    async listForAgentDefinition(agentDefinitionId) {
      const rows = await db
        .select({ worker: schema.workers })
        .from(schema.agentDefinitionWorkers)
        .innerJoin(
          schema.workers,
          eq(schema.agentDefinitionWorkers.workerId, schema.workers.id),
        )
        .where(
          and(
            eq(
              schema.agentDefinitionWorkers.agentDefinitionId,
              agentDefinitionId,
            ),
            eq(schema.agentDefinitionWorkers.enabled, true),
            eq(schema.workers.kind, "tool"),
          ),
        );
      return rows.map((r) => mapWorker(r.worker));
    },

    async listLinkedWorkerIds(agentDefinitionId) {
      const rows = await db
        .select({ workerId: schema.agentDefinitionWorkers.workerId })
        .from(schema.agentDefinitionWorkers)
        .where(
          and(
            eq(
              schema.agentDefinitionWorkers.agentDefinitionId,
              agentDefinitionId,
            ),
            eq(schema.agentDefinitionWorkers.enabled, true),
          ),
        );
      return rows.map((r) => r.workerId);
    },

    async createWorker(input: CreateWorkerInput) {
      const parsed = CreateWorkerInputSchema.parse(input);
      const kindConfig =
        parsed.kindConfig ?? defaultKindConfigForKind(parsed.kind);
      const [row] = await db
        .insert(schema.workers)
        .values({
          teamspaceId,
          accountId: null,
          key: parsed.key,
          name: parsed.name,
          description: parsed.description,
          kind: parsed.kind,
          inputSchema: parsed.inputSchema,
          outputSchema: parsed.outputSchema ?? null,
          script: parsed.script,
          runtime: parsed.runtime,
          kindConfig,
          version: 1,
        })
        .returning();
      if (!row) throw new Error("Failed to create worker");
      return mapWorker(row);
    },

    async updateWorker(id, patch: UpdateWorkerInput) {
      const parsed = UpdateWorkerInputSchema.parse(patch);
      const existing = await this.getById(id);
      if (!existing) throw new Error("Worker not found");

      const [row] = await db
        .update(schema.workers)
        .set({
          ...(parsed.name !== undefined ? { name: parsed.name } : {}),
          ...(parsed.description !== undefined
            ? { description: parsed.description }
            : {}),
          ...(parsed.inputSchema !== undefined
            ? { inputSchema: parsed.inputSchema }
            : {}),
          ...(parsed.outputSchema !== undefined
            ? { outputSchema: parsed.outputSchema }
            : {}),
          ...(parsed.script !== undefined ? { script: parsed.script } : {}),
          ...(parsed.kindConfig !== undefined
            ? { kindConfig: parsed.kindConfig }
            : {}),
          version: existing.version + 1,
          updatedAt: new Date(),
        })
        .where(and(sharedScope, eq(schema.workers.id, id)))
        .returning();
      if (!row) throw new Error("Worker not found");
      return mapWorker(row);
    },

    async deleteWorker(id) {
      const result = await db
        .delete(schema.workers)
        .where(and(sharedScope, eq(schema.workers.id, id)))
        .returning({ id: schema.workers.id });
      if (result.length === 0) throw new Error("Worker not found");
    },

    async setAgentWorkers(agentDefinitionId, workerIds) {
      await db
        .delete(schema.agentDefinitionWorkers)
        .where(
          and(
            eq(schema.agentDefinitionWorkers.teamspaceId, teamspaceId),
            eq(
              schema.agentDefinitionWorkers.agentDefinitionId,
              agentDefinitionId,
            ),
          ),
        );

      if (workerIds.length === 0) return;

      await db.insert(schema.agentDefinitionWorkers).values(
        workerIds.map((workerId) => ({
          teamspaceId,
          agentDefinitionId,
          workerId,
          enabled: true,
        })),
      );
    },
  };
}

/** @deprecated Use createWorkerPort */
export const createScriptToolPort = createWorkerPort;
