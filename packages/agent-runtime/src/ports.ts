import {
  createDb,
  createGraphPorts,
  createDbCatalogWritePort,
  createTaskPort,
  createAgentDefinitionPort,
  createScriptToolPort,
  createSkillPort,
  createPagePort,
  createConsolePort,
  createConnectorToolSettingsPort,
  registerTeamspaceOrganization,
  resolveOrganizationIdForTeamspace,
  getCachedOrganizationIdForTeamspace,
} from "@ssota/adapter-postgres";

export { registerTeamspaceOrganization };

type Db = ReturnType<typeof createDb>["db"];

let cachedDb: Db | undefined;

export function getDb(): Db {
  if (!cachedDb) {
    cachedDb = createDb(process.env.DATABASE_URL).db;
  }
  return cachedDb;
}

export function getTaskPort(teamspaceId: string, accountId?: string) {
  return createTaskPort(getDb(), { teamspaceId, accountId });
}

export function getGraphPorts(
  teamspaceId: string,
  accountId?: string,
  organizationId?: string,
) {
  const orgId =
    organizationId ?? getCachedOrganizationIdForTeamspace(teamspaceId);
  if (!orgId) {
    throw new Error(
      `Organization scope not registered for teamspace '${teamspaceId}'`,
    );
  }
  return createGraphPorts(getDb(), { organizationId: orgId, teamspaceId, accountId });
}

export async function getGraphPortsForTeamspace(
  teamspaceId: string,
  accountId?: string,
) {
  let organizationId = getCachedOrganizationIdForTeamspace(teamspaceId);
  if (!organizationId) {
    organizationId = await resolveOrganizationIdForTeamspace(getDb(), teamspaceId);
    registerTeamspaceOrganization(teamspaceId, organizationId);
  }
  return createGraphPorts(getDb(), { organizationId, teamspaceId, accountId });
}

export function getGraphReadPort(
  teamspaceId: string,
  accountId?: string,
  organizationId?: string,
) {
  return getGraphPorts(teamspaceId, accountId, organizationId).graphRead;
}

/** Catalog (node/edge type) write port. Catalog is org-wide (no account). */
export async function getCatalogWritePort(teamspaceId: string) {
  const organizationId = await resolveOrganizationIdForTeamspace(
    getDb(),
    teamspaceId,
  );
  return createDbCatalogWritePort(getDb(), { organizationId });
}

export function getAgentDefinitionPort(teamspaceId: string, accountId?: string) {
  return createAgentDefinitionPort(getDb(), { teamspaceId, accountId });
}

export function getScriptToolPort(teamspaceId: string, accountId?: string) {
  return createScriptToolPort(getDb(), { teamspaceId, accountId });
}

export function getSkillPort(organizationId: string) {
  return createSkillPort(getDb(), {
    teamspaceId: "",
    organizationId,
  });
}

/** @deprecated Use getAgentDefinitionPort */
export const getWorkflowInstructionPort = getAgentDefinitionPort;

export function getPagePort(teamspaceId: string, accountId?: string) {
  return createPagePort(getDb(), { teamspaceId, accountId });
}

export function getConsolePort() {
  return createConsolePort(getDb());
}

export function getConnectorToolSettingsPort() {
  return createConnectorToolSettingsPort(getDb());
}

/** Resolve the owning organization id for a teamspace, or null if not found. */
export async function resolveOrgIdForProject(
  teamspaceId: string,
): Promise<string | null> {
  const project = await getConsolePort().getTeamspaceById(teamspaceId);
  return project?.organizationId ?? null;
}

/** Register org scope for graph/catalog ports when not already cached. */
export async function ensureTeamspaceOrganizationScope(
  teamspaceId: string,
): Promise<string> {
  const cached = getCachedOrganizationIdForTeamspace(teamspaceId);
  if (cached) return cached;
  const organizationId = await resolveOrganizationIdForTeamspace(
    getDb(),
    teamspaceId,
  );
  registerTeamspaceOrganization(teamspaceId, organizationId);
  return organizationId;
}
