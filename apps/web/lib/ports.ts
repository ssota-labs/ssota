import {
  createAccountConnectionPort,
  createChatPort,
  createChatWorkspacePort,
  createConsolePort,
  createDb,
  createDbAccountReadPort,
  createGraphPorts,
  createOnboardingPort,
  createOrganizationSettingsPort,
  createOrganizationMembersPort,
  createTaskPort,
  createAgentDefinitionPort,
  createSkillPort,
  createSchedulePort,
  createPagePort,
  createPageViewStatePort,
  createConnectorToolSettingsPort,
  createOrgMembershipPort,
  registerTeamspaceOrganization,
  resolveOrganizationIdForTeamspace,
  getCachedOrganizationIdForTeamspace,
  type AccountRecord,
} from "@ssota/adapter-postgres";

type Db = ReturnType<typeof createDb>["db"];

let cachedDb: Db | undefined;

export function getDb(): Db {
  if (!cachedDb) {
    cachedDb = createDb(process.env.DATABASE_URL).db;
  }
  return cachedDb;
}

export {
  registerTeamspaceOrganization,
  resolveOrganizationIdForTeamspace,
  getCachedOrganizationIdForTeamspace,
};

export function getTaskPort(teamspaceId: string, accountId?: string) {
  return createTaskPort(getDb(), { teamspaceId, accountId });
}

export function getConsolePort() {
  return createConsolePort(getDb());
}

export function getConnectorToolSettingsPort() {
  return createConnectorToolSettingsPort(getDb());
}

export function getOrgMembershipPort() {
  return createOrgMembershipPort(getDb());
}

export function getOnboardingPort() {
  return createOnboardingPort(getDb());
}

export function getOrganizationSettingsPort() {
  return createOrganizationSettingsPort(getDb());
}

export function getOrganizationMembersPort() {
  return createOrganizationMembersPort(getDb());
}

export function getAccountReadPort() {
  return createDbAccountReadPort(getDb());
}

export async function getGraphPorts(teamspaceId: string, accountId?: string) {
  let organizationId = getCachedOrganizationIdForTeamspace(teamspaceId);
  if (!organizationId) {
    organizationId = await resolveOrganizationIdForTeamspace(getDb(), teamspaceId);
    registerTeamspaceOrganization(teamspaceId, organizationId);
  }
  return createGraphPorts(getDb(), { organizationId, teamspaceId, accountId });
}

/** @deprecated Use getGraphPorts — same behavior after async org resolution. */
export const getGraphPortsForTeamspace = getGraphPorts;

export function getChatPort(teamspaceId: string, accountId?: string | null) {
  return createChatPort(getDb(), { teamspaceId, accountId });
}

export function getAccountConnectionPort() {
  return createAccountConnectionPort(getDb());
}

export function getChatWorkspacePort() {
  return createChatWorkspacePort(getDb());
}

/**
 * The shared, per-teamspace account the builder console binds chat + connections to.
 * End-user surfaces use per-user accounts via AccountReadPort.provisionForUser.
 */
export async function getOrCreateProjectAccount(
  teamspaceId: string,
): Promise<AccountRecord> {
  return getAccountReadPort().getOrCreateWorkspaceAccount(teamspaceId);
}

export function getAgentDefinitionPort(teamspaceId: string) {
  return createAgentDefinitionPort(getDb(), { teamspaceId });
}

/** @deprecated Use getAgentDefinitionPort */
export const getWorkflowInstructionPort = getAgentDefinitionPort;

export async function getSkillPort(teamspaceId: string) {
  let organizationId = getCachedOrganizationIdForTeamspace(teamspaceId);
  if (!organizationId) {
    organizationId = await resolveOrganizationIdForTeamspace(getDb(), teamspaceId);
    registerTeamspaceOrganization(teamspaceId, organizationId);
  }
  return createSkillPort(getDb(), { organizationId, teamspaceId });
}

export function getSchedulePort(teamspaceId: string, accountId?: string | null) {
  return createSchedulePort(getDb(), { teamspaceId, accountId });
}

export function getPagePort(teamspaceId: string) {
  return createPagePort(getDb(), { teamspaceId });
}

export function getPageViewStatePort(teamspaceId: string) {
  return createPageViewStatePort(getDb(), { teamspaceId });
}

export async function resolveDefaultProjectId(): Promise<string> {
  const consolePort = getConsolePort();
  const org = await consolePort.getOrganizationBySlug("ssota-labs");
  if (!org) {
    throw new Error("Default organization not found — run db:seed");
  }
  const project = await consolePort.getTeamspaceBySlug(org.id, "ssota-dev");
  if (!project) {
    throw new Error("Default teamspace not found — run db:seed");
  }
  registerTeamspaceOrganization(project.id, org.id);
  return project.id;
}
