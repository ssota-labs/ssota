import { and, eq } from "drizzle-orm";
import { textToBlockNoteContent } from "@ssota/contracts";
import { getAgentDefinitionByKey } from "@ssota/contracts/agents";
import type { Db } from "../../db/client.js";
import * as schema from "../../db/schema.js";
import { createDbAccountReadPort } from "../../ports/account-read-port.js";
import { createAgentDefinitionPort } from "../../ports/agent-definition-port.js";

const SCHEDULE_SEEDS = [
  {
    agentKey: "main.ssota",
    targetType: "main_heartbeat" as const,
    cronExpression: "0 9 * * 1-5",
    timezone: "Asia/Seoul",
    enabled: true,
  },
  {
    agentKey: "specialist.implement_feature",
    targetType: "specialist_agent" as const,
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
  const agentPort = createAgentDefinitionPort(db, { teamspaceId });

  for (const seed of SCHEDULE_SEEDS) {
    const agent = getAgentDefinitionByKey(seed.agentKey);
    if (!agent) continue;

    const definition = await agentPort.upsertDefinition({
      key: agent.agentKey,
      name: agent.title,
      description: agent.description,
      instructions: textToBlockNoteContent(agent.instruction),
      agentKind: agent.agentKind,
      toolBundles: agent.toolBundles,
      nodeScopes: agent.nodeScopes,
      runPolicy: agent.runPolicy,
    });

    const existing = await db
      .select({ id: schema.schedules.id })
      .from(schema.schedules)
      .where(
        and(
          eq(schema.schedules.teamspaceId, teamspaceId),
          eq(schema.schedules.accountId, account.id),
          eq(schema.schedules.agentDefinitionId, definition.id),
        ),
      )
      .limit(1);

    if (existing[0]) continue;

    await db.insert(schema.schedules).values({
      teamspaceId,
      accountId: account.id,
      agentDefinitionId: definition.id,
      targetType: seed.targetType,
      cronExpression: seed.cronExpression,
      timezone: seed.timezone,
      enabled: seed.enabled,
    });
  }
}
