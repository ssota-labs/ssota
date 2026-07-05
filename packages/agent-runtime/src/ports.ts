import {
  createDb,
  createGraphPorts,
  createDbCatalogWritePort,
  createTaskPort,
  createAgentDefinitionPort,
  createWorkerPort,
  createSkillPort,
  createTeamspaceMainConfigPort,
  createPagePort,
  createConsolePort,
  createConnectorToolSettingsPort,
  createSandboxEnvironmentPort,
  createSandboxSessionRecordPort,
  registerTeamspaceOrganization,
  resolveOrganizationIdForTeamspace,
  getCachedOrganizationIdForTeamspace,
} from "@ssota/adapter-postgres";
import { createSandboxProvider } from "./sandbox/provider.js";

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

export function getTeamspaceMainConfigPort() {
  return createTeamspaceMainConfigPort(getDb());
}

export function getWorkerPort(teamspaceId: string, accountId?: string) {
  return createWorkerPort(getDb(), { teamspaceId, accountId });
}

/** @deprecated Use getWorkerPort */
export const getScriptToolPort = getWorkerPort;

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

export function getSandboxEnvironmentPort(teamspaceId: string) {
  return createSandboxEnvironmentPort(getDb(), { teamspaceId });
}

export function getSandboxSessionRecordPort(teamspaceId: string) {
  return createSandboxSessionRecordPort(getDb(), { teamspaceId });
}

export function getSandboxSessionPort(teamspaceId: string) {
  return createSandboxProvider({
    environmentPort: getSandboxEnvironmentPort(teamspaceId),
    sessionRecordPort: getSandboxSessionRecordPort(teamspaceId),
    githubToken: process.env.GITHUB_TOKEN,
  });
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
