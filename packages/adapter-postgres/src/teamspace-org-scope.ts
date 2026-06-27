import { eq } from "drizzle-orm";
import type { Db } from "./db/client.js";
import * as schema from "./db/schema.js";

export async function resolveOrganizationIdForTeamspace(
  db: Db,
  teamspaceId: string,
): Promise<string> {
  const [row] = await db
    .select({ organizationId: schema.teamspaces.organizationId })
    .from(schema.teamspaces)
    .where(eq(schema.teamspaces.id, teamspaceId))
    .limit(1);
  if (!row) {
    throw new Error(`Teamspace '${teamspaceId}' not found`);
  }
  return row.organizationId;
}

/** Module cache for sync graph port factories (web/mcp). */
const teamspaceOrgCache = new Map<string, string>();

export function registerTeamspaceOrganization(
  teamspaceId: string,
  organizationId: string,
): void {
  teamspaceOrgCache.set(teamspaceId, organizationId);
}

export function getCachedOrganizationIdForTeamspace(
  teamspaceId: string,
): string | undefined {
  return teamspaceOrgCache.get(teamspaceId);
}

export function requireCachedOrganizationIdForTeamspace(
  teamspaceId: string,
): string {
  const organizationId = teamspaceOrgCache.get(teamspaceId);
  if (!organizationId) {
    throw new Error(
      `Organization scope not registered for teamspace '${teamspaceId}'`,
    );
  }
  return organizationId;
}
