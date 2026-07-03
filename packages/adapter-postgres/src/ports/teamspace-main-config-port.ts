import { eq } from "drizzle-orm";
import type { TeamspaceMainConfigPort } from "@ssota/core";
import {
  TeamspaceMainConfigSchema,
  UpdateTeamspaceMainConfigInputSchema,
  DEFAULT_MAIN_TOOL_BUNDLES,
  DEFAULT_MAIN_RUN_POLICY,
  textToBlockNoteContent,
  type TeamspaceMainConfig,
} from "@ssota/contracts";
import { getMainAgentDefinition } from "@ssota/contracts/agents";
import type { Db } from "../db/client.js";
import * as schema from "../db/schema.js";

function defaultMainConfig(teamspaceId: string): TeamspaceMainConfig {
  const builtin = getMainAgentDefinition();
  return TeamspaceMainConfigSchema.parse({
    teamspaceId,
    instructions: textToBlockNoteContent(builtin.instruction),
    toolBundles: builtin.toolBundles.length
      ? builtin.toolBundles
      : [...DEFAULT_MAIN_TOOL_BUNDLES],
    runPolicy: builtin.runPolicy.allowedTriggers?.length
      ? builtin.runPolicy
      : { ...DEFAULT_MAIN_RUN_POLICY },
    updatedAt: new Date(0).toISOString(),
  });
}

function mapRow(
  teamspaceId: string,
  row: typeof schema.teamspaces.$inferSelect,
): TeamspaceMainConfig {
  const hasStored =
    (Array.isArray(row.mainInstructions) && row.mainInstructions.length > 0) ||
    (Array.isArray(row.mainToolBundles) && row.mainToolBundles.length > 0) ||
    (row.mainRunPolicy &&
      typeof row.mainRunPolicy === "object" &&
      Object.keys(row.mainRunPolicy).length > 0);

  if (!hasStored) {
    return defaultMainConfig(teamspaceId);
  }

  return TeamspaceMainConfigSchema.parse({
    teamspaceId,
    instructions: row.mainInstructions ?? [],
    toolBundles:
      Array.isArray(row.mainToolBundles) && row.mainToolBundles.length > 0
        ? row.mainToolBundles
        : [...DEFAULT_MAIN_TOOL_BUNDLES],
    runPolicy: row.mainRunPolicy ?? {},
    updatedAt: row.createdAt.toISOString(),
  });
}

export function createTeamspaceMainConfigPort(db: Db): TeamspaceMainConfigPort {
  return {
    async getMainConfig(teamspaceId) {
      const rows = await db
        .select()
        .from(schema.teamspaces)
        .where(eq(schema.teamspaces.id, teamspaceId))
        .limit(1);
      if (!rows[0]) return null;
      return mapRow(teamspaceId, rows[0]);
    },

    async updateMainConfig(teamspaceId, input) {
      const parsed = UpdateTeamspaceMainConfigInputSchema.parse(input);
      const existing = await this.getMainConfig(teamspaceId);
      const base = existing ?? defaultMainConfig(teamspaceId);
      const next: TeamspaceMainConfig = TeamspaceMainConfigSchema.parse({
        teamspaceId,
        instructions: parsed.instructions ?? base.instructions,
        toolBundles: parsed.toolBundles ?? base.toolBundles,
        runPolicy: parsed.runPolicy ?? base.runPolicy,
        updatedAt: new Date().toISOString(),
      });
      const [row] = await db
        .update(schema.teamspaces)
        .set({
          mainInstructions: next.instructions,
          mainToolBundles: next.toolBundles,
          mainRunPolicy: next.runPolicy,
        })
        .where(eq(schema.teamspaces.id, teamspaceId))
        .returning();
      if (!row) {
        throw new Error(`Teamspace ${teamspaceId} not found`);
      }
      return mapRow(teamspaceId, row);
    },
  };
}

export async function seedTeamspaceMainConfig(
  db: Db,
  teamspaceId: string,
): Promise<void> {
  const rows = await db
    .select()
    .from(schema.teamspaces)
    .where(eq(schema.teamspaces.id, teamspaceId))
    .limit(1);
  const row = rows[0];
  if (!row) return;

  const hasStored =
    (Array.isArray(row.mainInstructions) && row.mainInstructions.length > 0) ||
    (Array.isArray(row.mainToolBundles) && row.mainToolBundles.length > 0) ||
    (row.mainRunPolicy &&
      typeof row.mainRunPolicy === "object" &&
      Object.keys(row.mainRunPolicy).length > 0);

  if (hasStored) return;

  const port = createTeamspaceMainConfigPort(db);
  const defaults = defaultMainConfig(teamspaceId);
  await port.updateMainConfig(teamspaceId, {
    instructions: defaults.instructions,
    toolBundles: defaults.toolBundles,
    runPolicy: defaults.runPolicy,
  });
}
