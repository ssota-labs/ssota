import { and, eq, isNull } from "drizzle-orm";
import { BUILTIN_AGENT_IDS } from "@ssota/contracts/agents";
import { MAIN_DEFAULT_SKILL_KEYS } from "@ssota/contracts";
import type { Db } from "../../db/client.js";
import * as schema from "../../db/schema.js";
import { createSkillPort } from "../../ports/skill-port.js";

/**
 * Idempotent: bind main agent to platform default skill pack with ready locks.
 */
export async function seedMainDefaultSkillBindings(
  db: Db,
  input: { organizationId: string; teamspaceId: string },
): Promise<number> {
  const { organizationId, teamspaceId } = input;
  const mainAgentId = BUILTIN_AGENT_IDS.main;

  const existingBindings = await db
    .select({ skillId: schema.agentDefinitionSkills.skillId })
    .from(schema.agentDefinitionSkills)
    .where(eq(schema.agentDefinitionSkills.agentDefinitionId, mainAgentId))
    .limit(1);

  if (existingBindings.length > 0) {
    return 0;
  }

  const skillRows = await db
    .select()
    .from(schema.skills)
    .where(
      and(
        isNull(schema.skills.organizationId),
        eq(schema.skills.source, "builtin"),
      ),
    );

  const skillIds = skillRows
    .filter((row) =>
      (MAIN_DEFAULT_SKILL_KEYS as readonly string[]).includes(row.key),
    )
    .map((row) => row.id);

  if (skillIds.length === 0) {
    return 0;
  }

  const port = createSkillPort(db, { organizationId, teamspaceId });
  await port.updateAgentSkillBindings(teamspaceId, mainAgentId, skillIds);
  return skillIds.length;
}
