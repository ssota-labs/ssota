import {
  createAccountConnectionPort,
  createChatPort,
  createChatWorkspacePort,
  createConsolePort,
  createDb,
  createDbAccountReadPort,
  createGraphPorts,
  createOnboardingPort,
  createTaskPort,
  createWorkflowInstructionPort,
  createSchedulePort,
  createPagePort,
  createPageViewStatePort,
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

export function getTaskPort(projectId: string, accountId?: string) {
  return createTaskPort(getDb(), { projectId, accountId });
}

export function getConsolePort() {
  return createConsolePort(getDb());
}

export function getOnboardingPort() {
  return createOnboardingPort(getDb());
}

export function getAccountReadPort() {
  return createDbAccountReadPort(getDb());
}

export function getGraphPorts(projectId: string, accountId?: string) {
  return createGraphPorts(getDb(), { projectId, accountId });
}

export function getChatPort(projectId: string, accountId?: string | null) {
  return createChatPort(getDb(), { projectId, accountId });
}

export function getAccountConnectionPort() {
  return createAccountConnectionPort(getDb());
}

export function getChatWorkspacePort() {
  return createChatWorkspacePort(getDb());
}

/**
 * The shared, per-project account the builder console binds chat + connections to.
 * End-user surfaces use per-user accounts via AccountReadPort.provisionForUser.
 */
export async function getOrCreateProjectAccount(
  projectId: string,
): Promise<AccountRecord> {
  return getAccountReadPort().getOrCreateWorkspaceAccount(projectId);
}

export function getWorkflowInstructionPort(projectId: string) {
  return createWorkflowInstructionPort(getDb(), { projectId });
}

export function getSchedulePort(projectId: string, accountId?: string | null) {
  return createSchedulePort(getDb(), { projectId, accountId });
}

export function getPagePort(projectId: string) {
  return createPagePort(getDb(), { projectId });
}

export function getPageViewStatePort(projectId: string) {
  return createPageViewStatePort(getDb(), { projectId });
}

export async function resolveDefaultProjectId(): Promise<string> {
  const consolePort = getConsolePort();
  const org = await consolePort.getOrganizationBySlug("ssota-labs");
  if (!org) {
    throw new Error("Default organization not found — run db:seed");
  }
  const project = await consolePort.getProjectBySlug(org.id, "ssota-dev");
  if (!project) {
    throw new Error("Default project not found — run db:seed");
  }
  return project.id;
}
