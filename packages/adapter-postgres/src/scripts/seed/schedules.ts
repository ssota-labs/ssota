import { and, eq } from "drizzle-orm";
import { BUILTIN_AGENT_IDS, SWDL_AGENT_IDS } from "@ssota/contracts/agents";
import type { Db } from "../../db/client.js";
import * as schema from "../../db/schema.js";
import { createDbAccountReadPort } from "../../ports/account-read-port.js";

/**
 * Schedules for the software-dev template teamspace.
 * - Main: platform chat heartbeat (Console UX) — not a SWDL domain worker.
 * - SWDL Orchestrator: weekday + weekly cadence (AX S4 — specialists via spawn_task).
 */
const SCHEDULE_SEEDS = [
  {
    agentDefinitionId: BUILTIN_AGENT_IDS.main,
    targetType: "main_heartbeat" as const,
    cronExpression: "0 9 * * 1-5",
    timezone: "Asia/Seoul",
    enabled: true,
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
 * Idempotent schedules for the builder workspace account.
 * Requires applyTemplate (Main + SWDL agents) first.
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
    });
  }
}
