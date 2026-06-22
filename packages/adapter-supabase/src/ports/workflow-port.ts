import { and, eq } from "drizzle-orm";
import type { ActionPortsScope, WorkflowPort } from "@ssota/core";
import {
  WORKFLOW_REGISTRY,
  WorkflowInstructionDefinitionSchema,
  type WorkflowInstructionDefinition,
} from "@ssota/contracts/workflows";
import type { Db } from "../db/client.js";
import * as schema from "../db/schema.js";

type WorkflowRow = typeof schema.workflows.$inferSelect;

function mapWorkflow(row: WorkflowRow): WorkflowInstructionDefinition {
  return WorkflowInstructionDefinitionSchema.parse({
    workflowKey: row.workflowKey,
    title: row.title,
    category: row.category,
    cadenceHint: row.cadenceHint ?? undefined,
    defaultExecutorType: row.defaultExecutorType ?? undefined,
    defaultStatus: row.defaultStatus ?? undefined,
    instruction: row.instruction,
  });
}

function toValues(projectId: string, def: WorkflowInstructionDefinition) {
  return {
    projectId,
    workflowKey: def.workflowKey,
    title: def.title,
    category: def.category,
    cadenceHint: def.cadenceHint ?? null,
    defaultExecutorType: def.defaultExecutorType ?? null,
    defaultStatus: def.defaultStatus ?? null,
    instruction: def.instruction,
  };
}

/**
 * DB-backed {@link WorkflowPort} over the `workflows` table. Project-scoped;
 * `accountId` is accepted for interface symmetry but workflows are a
 * project-level concept today (no `account_id` column yet).
 */
export function createWorkflowPort(db: Db, scope: ActionPortsScope): WorkflowPort {
  const { projectId } = scope;
  return {
    async listWorkflows() {
      const rows = await db
        .select()
        .from(schema.workflows)
        .where(eq(schema.workflows.projectId, projectId));
      return rows.map(mapWorkflow);
    },
    async getWorkflowByKey(workflowKey) {
      const rows = await db
        .select()
        .from(schema.workflows)
        .where(
          and(
            eq(schema.workflows.projectId, projectId),
            eq(schema.workflows.workflowKey, workflowKey),
          ),
        )
        .limit(1);
      return rows[0] ? mapWorkflow(rows[0]) : null;
    },
    async upsertWorkflow(def) {
      const parsed = WorkflowInstructionDefinitionSchema.parse(def);
      const [row] = await db
        .insert(schema.workflows)
        .values(toValues(projectId, parsed))
        .onConflictDoUpdate({
          target: [schema.workflows.projectId, schema.workflows.workflowKey],
          set: {
            title: parsed.title,
            category: parsed.category,
            cadenceHint: parsed.cadenceHint ?? null,
            defaultExecutorType: parsed.defaultExecutorType ?? null,
            defaultStatus: parsed.defaultStatus ?? null,
            instruction: parsed.instruction,
            updatedAt: new Date(),
          },
        })
        .returning();
      return mapWorkflow(row!);
    },
    async deleteWorkflow(workflowKey) {
      await db
        .delete(schema.workflows)
        .where(
          and(
            eq(schema.workflows.projectId, projectId),
            eq(schema.workflows.workflowKey, workflowKey),
          ),
        );
    },
  };
}

/**
 * Bootstrap-seed every project with the embedded workflow registry. Idempotent
 * (insert … on conflict do nothing) so re-running never clobbers tenant edits.
 * Call alongside `seedDomainCatalog` at project creation — NOT inside the
 * domain example pack, since workflows are a core, domain-agnostic concept.
 */
export async function seedWorkflows(
  db: Db,
  projectId: string,
  workflows: WorkflowInstructionDefinition[] = Object.values(WORKFLOW_REGISTRY),
): Promise<void> {
  const values = workflows.map((def) => toValues(projectId, def));
  if (values.length === 0) return;
  await db.insert(schema.workflows).values(values).onConflictDoNothing({
    target: [schema.workflows.projectId, schema.workflows.workflowKey],
  });
}
