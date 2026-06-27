import { and, eq } from "drizzle-orm";
import { textToBlockNoteContent } from "@ssota/contracts";
import { getBuiltinWorkflowByKey } from "@ssota/contracts/workflows";
import type { Db } from "../../db/client.js";
import * as schema from "../../db/schema.js";
import { createDbAccountReadPort } from "../../ports/account-read-port.js";
import { createWorkflowInstructionPort } from "../../ports/workflow-instruction-port.js";

const SCHEDULE_SEEDS = [
  {
    workflowKey: "orchestrator.daily",
    cronExpression: "0 9 * * 1-5",
    timezone: "Asia/Seoul",
    enabled: true,
  },
  {
    workflowKey: "orchestrator.weekly",
    cronExpression: "0 9 * * 1",
    timezone: "Asia/Seoul",
    enabled: true,
  },
] as const;

/**
 * Idempotent demo schedules for the builder workspace account so the Scheduler
 * page shows document-list rows out of the box.
 */
export async function seedScheduleFixtures(
  db: Db,
  projectId: string,
): Promise<void> {
  const account = await createDbAccountReadPort(db).getOrCreateWorkspaceAccount(
    projectId,
  );
  const workflowPort = createWorkflowInstructionPort(db, { projectId });

  for (const seed of SCHEDULE_SEEDS) {
    const builtin = getBuiltinWorkflowByKey(seed.workflowKey);
    if (!builtin) continue;

    const instruction = await workflowPort.upsertInstruction({
      key: builtin.workflowKey,
      name: builtin.title,
      description: builtin.description,
      content: textToBlockNoteContent(builtin.instruction),
    });

    const existing = await db
      .select({ id: schema.schedules.id })
      .from(schema.schedules)
      .where(
        and(
          eq(schema.schedules.projectId, projectId),
          eq(schema.schedules.accountId, account.id),
          eq(schema.schedules.workflowInstructionId, instruction.id),
        ),
      )
      .limit(1);

    if (existing[0]) continue;

    await db.insert(schema.schedules).values({
      projectId,
      accountId: account.id,
      workflowInstructionId: instruction.id,
      cronExpression: seed.cronExpression,
      timezone: seed.timezone,
      enabled: seed.enabled,
    });
  }
}
