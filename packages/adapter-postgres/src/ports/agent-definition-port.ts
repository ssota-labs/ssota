import { and, eq, isNull } from "drizzle-orm";
import type { ActionPortsScope, AgentDefinitionPort } from "@ssota/core";
import {
  AgentDefinitionSchema,
  AgentDefinitionSeedSchema,
  type UpsertAgentDefinitionInput,
  type AgentDefinition,
  type AgentDefinitionIndex,
} from "@ssota/contracts";
import type { Db } from "../db/client.js";
import * as schema from "../db/schema.js";

type DefinitionRow = typeof schema.agentDefinitions.$inferSelect;

function mapDefinition(row: DefinitionRow): AgentDefinition {
  return AgentDefinitionSchema.parse({
    id: row.id,
    teamspaceId: row.teamspaceId,
    accountId: row.accountId,
    name: row.name,
    description: row.description,
    instructions: row.instructions,
    isMain: row.isMain,
    referenceOnly: row.referenceOnly,
    toolBundles: row.toolBundles,
    nodeScopes: row.nodeScopes,
    runPolicy: row.runPolicy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

function mapIndex(row: DefinitionRow): AgentDefinitionIndex {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isMain: row.isMain,
    referenceOnly: row.referenceOnly,
  };
}

function accountCondition(accountId?: string | null) {
  return accountId
    ? eq(schema.agentDefinitions.accountId, accountId)
    : isNull(schema.agentDefinitions.accountId);
}

export function createAgentDefinitionPort(
  db: Db,
  scope: ActionPortsScope,
): AgentDefinitionPort {
  const { teamspaceId } = scope;

  return {
    async listDefinitions() {
      const rows = await db
        .select()
        .from(schema.agentDefinitions)
        .where(
          and(
            eq(schema.agentDefinitions.teamspaceId, teamspaceId),
            isNull(schema.agentDefinitions.accountId),
          ),
        );
      return rows.map(mapIndex);
    },

    async getById(id) {
      const rows = await db
        .select()
        .from(schema.agentDefinitions)
        .where(
          and(
            eq(schema.agentDefinitions.teamspaceId, teamspaceId),
            eq(schema.agentDefinitions.id, id),
          ),
        )
        .limit(1);
      return rows[0] ? mapDefinition(rows[0]) : null;
    },

    async upsertDefinition(input) {
      const parsed = AgentDefinitionSeedSchema.parse(input);
      const accountId = input.accountId ?? null;
      const existing = await db
        .select()
        .from(schema.agentDefinitions)
        .where(
          and(
            eq(schema.agentDefinitions.teamspaceId, teamspaceId),
            eq(schema.agentDefinitions.id, parsed.id),
            accountCondition(accountId),
          ),
        )
        .limit(1);
      if (existing[0]) {
        const [row] = await db
          .update(schema.agentDefinitions)
          .set({
            name: parsed.name,
            description: parsed.description,
            instructions: parsed.instructions,
            isMain: parsed.isMain,
            referenceOnly: parsed.referenceOnly,
            toolBundles: parsed.toolBundles,
            nodeScopes: parsed.nodeScopes,
            runPolicy: parsed.runPolicy,
            updatedAt: new Date(),
          })
          .where(eq(schema.agentDefinitions.id, existing[0].id))
          .returning();
        return mapDefinition(row!);
      }
      const [row] = await db
        .insert(schema.agentDefinitions)
        .values({
          id: parsed.id,
          teamspaceId,
          accountId,
          name: parsed.name,
          description: parsed.description,
          instructions: parsed.instructions,
          isMain: parsed.isMain,
          referenceOnly: parsed.referenceOnly,
          toolBundles: parsed.toolBundles,
          nodeScopes: parsed.nodeScopes,
          runPolicy: parsed.runPolicy,
        })
        .returning();
      return mapDefinition(row!);
    },

    async deleteById(id, accountId = null) {
      await db
        .delete(schema.agentDefinitions)
        .where(
          and(
            eq(schema.agentDefinitions.teamspaceId, teamspaceId),
            eq(schema.agentDefinitions.id, id),
            accountCondition(accountId),
          ),
        );
    },
  };
}

/** @deprecated Use createAgentDefinitionPort */
export const createWorkflowInstructionPort = createAgentDefinitionPort;

/**
 * Bootstrap-seed agent definitions for a teamspace. Idempotent by stable id.
 */
export async function seedAgentDefinitions(
  db: Db,
  teamspaceId: string,
  seeds: UpsertAgentDefinitionInput[],
): Promise<void> {
  const port = createAgentDefinitionPort(db, { teamspaceId });
  for (const seed of seeds) {
    await port.upsertDefinition(seed);
  }
}

/** @deprecated Use seedAgentDefinitions */
export const seedWorkflowInstructions = seedAgentDefinitions;
