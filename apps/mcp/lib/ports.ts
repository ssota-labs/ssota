import {
  createConsolePort,
  createGraphPorts,
  createDb,
  createTaskPort,
  createWorkflowInstructionPort,
  registerTeamspaceOrganization,
  resolveOrganizationIdForTeamspace,
  getCachedOrganizationIdForTeamspace,
} from "@ssota/adapter-postgres";

type Db = ReturnType<typeof createDb>["db"];

let cachedDb: Db | undefined;

export function getDb(): Db {
  if (!cachedDb) {
    cachedDb = createDb(process.env.DATABASE_URL).db;
  }
  return cachedDb;
}

export function getTaskPort(teamspaceId: string) {
  return createTaskPort(getDb(), { teamspaceId });
}

export function getWorkflowInstructionPort(teamspaceId: string) {
  return createWorkflowInstructionPort(getDb(), { teamspaceId });
}

export function getGraphPorts(teamspaceId: string, organizationId?: string) {
  const orgId =
    organizationId ?? getCachedOrganizationIdForTeamspace(teamspaceId);
  if (!orgId) {
    throw new Error(
      `Organization scope not registered for teamspace '${teamspaceId}'`,
    );
  }
  return createGraphPorts(getDb(), { organizationId: orgId, teamspaceId });
}

export async function getGraphPortsForTeamspace(teamspaceId: string) {
  let organizationId = getCachedOrganizationIdForTeamspace(teamspaceId);
  if (!organizationId) {
    organizationId = await resolveOrganizationIdForTeamspace(getDb(), teamspaceId);
    registerTeamspaceOrganization(teamspaceId, organizationId);
  }
  return createGraphPorts(getDb(), { organizationId, teamspaceId });
}

export function getGraphReadPort(teamspaceId: string, organizationId?: string) {
  return getGraphPorts(teamspaceId, organizationId).graphRead;
}

export async function resolveDefaultProjectId(): Promise<string> {
  const consolePort = createConsolePort(getDb());
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
