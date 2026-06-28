import {
  resolveOrganizationIdForTeamspace,
  seedDomainCatalog,
} from "@ssota/adapter-postgres";
import { getDb } from "@/lib/ports";

/** Idempotent — inserts missing node_catalog / edge_catalog rows for an org. */
export async function ensureProjectCatalog(teamspaceId: string): Promise<void> {
  const organizationId = await resolveOrganizationIdForTeamspace(
    getDb(),
    teamspaceId,
  );
  await seedDomainCatalog(getDb(), organizationId);
}
