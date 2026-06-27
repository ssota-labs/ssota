import { and, eq } from "drizzle-orm";
import { textToBlockNoteContent } from "@ssota/contracts";
import { getWorkflowByKey } from "@ssota/contracts/workflows";
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
  teamspaceId: string,
): Promise<void> {
  const account = await createDbAccountReadPort(db).getOrCreateWorkspaceAccount(
    teamspaceId,
  );
  const workflowPort = createWorkflowInstructionPort(db, { teamspaceId });

  for (const seed of SCHEDULE_SEEDS) {
    const workflow = getWorkflowByKey(seed.workflowKey);
    if (!workflow) continue;

    const instruction = await workflowPort.upsertInstruction({
      key: workflow.workflowKey,
      name: workflow.title,
      description: workflow.description,
      content: textToBlockNoteContent(workflow.instruction),
    });

    const existing = await db
      .select({ id: schema.schedules.id })
      .from(schema.schedules)
      .where(
        and(
          eq(schema.schedules.teamspaceId, teamspaceId),
          eq(schema.schedules.accountId, account.id),
          eq(schema.schedules.workflowInstructionId, instruction.id),
        ),
      )
      .limit(1);

    if (existing[0]) continue;

    await db.insert(schema.schedules).values({
      teamspaceId,
      accountId: account.id,
      workflowInstructionId: instruction.id,
      cronExpression: seed.cronExpression,
      timezone: seed.timezone,
      enabled: seed.enabled,
    });
  }
}
