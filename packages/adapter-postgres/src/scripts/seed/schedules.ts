import { and, eq } from "drizzle-orm";
import { SWDL_AGENT_IDS } from "@ssota/contracts/agents";
import type { Db } from "../../db/client.js";
import * as schema from "../../db/schema.js";
import { createDbAccountReadPort } from "../../ports/platform/account-read-port.js";

/**
 * SWDL Domain Pack schedules — Direction cadence (Cycle A) + Orchestrator (B–D/G).
 */
const SCHEDULE_SEEDS = [
  {
    agentDefinitionId: SWDL_AGENT_IDS.direction,
    targetType: "agent" as const,
    cronExpression: "0 8 * * 1",
    timezone: "Asia/Seoul",
    enabled: true,
    idempotencyPrefix: "swdl:direction:weekly-kpi",
  },
  {
    agentDefinitionId: SWDL_AGENT_IDS.direction,
    targetType: "agent" as const,
    cronExpression: "0 8 1 1,4,7,10 *",
    timezone: "Asia/Seoul",
    enabled: true,
    idempotencyPrefix: "swdl:direction:quarterly",
  },
  {
    agentDefinitionId: SWDL_AGENT_IDS.orchestrator,
    targetType: "agent" as const,
    cronExpression: "0 9 * * 1-5",
    timezone: "Asia/Seoul",
    enabled: true,
  },
  {
    agentDefinitionId: SWDL_AGENT_IDS.orchestrator,
    targetType: "agent" as const,
    cronExpression: "0 10 * * 1",
    timezone: "Asia/Seoul",
    enabled: true,
  },
] as const;

/**
 * Idempotent SWDL schedules for the builder workspace account.
 * Requires applyTemplate (SWDL agents) first.
 */
export async function seedScheduleFixtures(
  db: Db,
  teamspaceId: string,
): Promise<void> {
  const account = await createDbAccountReadPort(db).getOrCreateWorkspaceAccount(
    teamspaceId,
  );

  for (const seed of SCHEDULE_SEEDS) {
    const existing = await db
      .select({ id: schema.schedules.id })
      .from(schema.schedules)
      .where(
        and(
          eq(schema.schedules.teamspaceId, teamspaceId),
          eq(schema.schedules.accountId, account.id),
          eq(schema.schedules.agentDefinitionId, seed.agentDefinitionId),
          eq(schema.schedules.cronExpression, seed.cronExpression),
        ),
      )
      .limit(1);

    if (existing[0]) continue;

    await db.insert(schema.schedules).values({
      teamspaceId,
      accountId: account.id,
      agentDefinitionId: seed.agentDefinitionId,
      targetType: seed.targetType,
      cronExpression: seed.cronExpression,
      timezone: seed.timezone,
      enabled: seed.enabled,
      idempotencyPrefix:
        "idempotencyPrefix" in seed ? seed.idempotencyPrefix : "",
    });
  }
}
