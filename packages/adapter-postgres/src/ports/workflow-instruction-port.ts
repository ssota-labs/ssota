import { and, eq, isNull } from "drizzle-orm";
import type {
  ActionPortsScope,
  WorkflowInstructionPort,
} from "@ssota/core";
import {
  WorkflowInstructionSchema,
  WorkflowInstructionSeedSchema,
  type UpsertWorkflowInstructionInput,
  type WorkflowInstruction,
  type WorkflowInstructionIndex,
} from "@ssota/contracts";
import type { Db } from "../db/client.js";
import * as schema from "../db/schema.js";

type InstructionRow = typeof schema.workflowInstructions.$inferSelect;

function mapInstruction(row: InstructionRow): WorkflowInstruction {
  return WorkflowInstructionSchema.parse({
    id: row.id,
    teamspaceId: row.teamspaceId,
    accountId: row.accountId,
    key: row.key,
    name: row.name,
    description: row.description,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

function mapIndex(row: InstructionRow): WorkflowInstructionIndex {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description,
  };
}

function accountCondition(accountId?: string | null) {
  return accountId
    ? eq(schema.workflowInstructions.accountId, accountId)
    : isNull(schema.workflowInstructions.accountId);
}

export function createWorkflowInstructionPort(
  db: Db,
  scope: ActionPortsScope,
): WorkflowInstructionPort {
  const { teamspaceId } = scope;

  return {
    async listInstructions() {
      const rows = await db
        .select()
        .from(schema.workflowInstructions)
        .where(
          and(
            eq(schema.workflowInstructions.teamspaceId, teamspaceId),
            isNull(schema.workflowInstructions.accountId),
          ),
        );
      return rows.map(mapIndex);
    },

    async getById(id) {
      const rows = await db
        .select()
        .from(schema.workflowInstructions)
        .where(
          and(
            eq(schema.workflowInstructions.teamspaceId, teamspaceId),
            eq(schema.workflowInstructions.id, id),
          ),
        )
        .limit(1);
      return rows[0] ? mapInstruction(rows[0]) : null;
    },

    async getByKey(key, accountId = null) {
      const rows = await db
        .select()
        .from(schema.workflowInstructions)
        .where(
          and(
            eq(schema.workflowInstructions.teamspaceId, teamspaceId),
            eq(schema.workflowInstructions.key, key),
            accountCondition(accountId),
          ),
        )
        .limit(1);
      return rows[0] ? mapInstruction(rows[0]) : null;
    },

    async upsertInstruction(input) {
      const parsed = WorkflowInstructionSeedSchema.parse(input);
      const accountId = input.accountId ?? null;
      const existing = await db
        .select()
        .from(schema.workflowInstructions)
        .where(
          and(
            eq(schema.workflowInstructions.teamspaceId, teamspaceId),
            eq(schema.workflowInstructions.key, parsed.key),
            accountCondition(accountId),
          ),
        )
        .limit(1);
      if (existing[0]) {
        const [row] = await db
          .update(schema.workflowInstructions)
          .set({
            name: parsed.name,
            description: parsed.description,
            content: parsed.content,
            updatedAt: new Date(),
          })
          .where(eq(schema.workflowInstructions.id, existing[0].id))
          .returning();
        return mapInstruction(row!);
      }
      const [row] = await db
        .insert(schema.workflowInstructions)
        .values({
          teamspaceId,
          accountId,
          key: parsed.key,
          name: parsed.name,
          description: parsed.description,
          content: parsed.content,
        })
        .returning();
      return mapInstruction(row!);
    },

    async deleteByKey(key, accountId = null) {
      await db
        .delete(schema.workflowInstructions)
        .where(
          and(
            eq(schema.workflowInstructions.teamspaceId, teamspaceId),
            eq(schema.workflowInstructions.key, key),
            accountCondition(accountId),
          ),
        );
    },
  };
}

/**
 * Bootstrap-seed workflow instructions for a project. Idempotent.
 */
export async function seedWorkflowInstructions(
  db: Db,
  teamspaceId: string,
  seeds: UpsertWorkflowInstructionInput[],
): Promise<void> {
  for (const seed of seeds) {
    const parsed = WorkflowInstructionSeedSchema.parse(seed);
    const existing = await db
      .select()
      .from(schema.workflowInstructions)
      .where(
        and(
          eq(schema.workflowInstructions.teamspaceId, teamspaceId),
          eq(schema.workflowInstructions.key, parsed.key),
          isNull(schema.workflowInstructions.accountId),
        ),
      )
      .limit(1);
    if (existing[0]) {
      await db
        .update(schema.workflowInstructions)
        .set({
          name: parsed.name,
          description: parsed.description,
          content: parsed.content,
          updatedAt: new Date(),
        })
        .where(eq(schema.workflowInstructions.id, existing[0].id));
    } else {
      await db.insert(schema.workflowInstructions).values({
        teamspaceId,
        accountId: null,
        key: parsed.key,
        name: parsed.name,
        description: parsed.description,
        content: parsed.content,
      });
    }
  }
}
