import {
  createAccountConnectionPort,
  createAccountPort,
  createChatPort,
  createChatWorkspacePort,
  createConsolePort,
  createGraphPorts,
  createDb,
  createOnboardingPort,
  createTaskPort,
  type AccountRecord,
} from "@ssota/adapter-supabase";

type Db = ReturnType<typeof createDb>["db"];

let cachedDb: Db | undefined;

export function getDb(): Db {
  if (!cachedDb) {
    cachedDb = createDb(process.env.DATABASE_URL).db;
  }
  return cachedDb;
}

export function getTaskPort(projectId: string) {
  return createTaskPort(getDb(), { projectId });
}

export function getConsolePort() {
  return createConsolePort(getDb());
}

export function getOnboardingPort() {
  return createOnboardingPort(getDb());
}

export function getGraphPorts(projectId: string) {
  return createGraphPorts(getDb(), { projectId });
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
 * The shared, per-project account the in-app console binds chat + connections
 * to. Multi-tenant per-user accounts are out of scope for now, so every console
 * surface for a project uses one stable account (slug "workspace"). Idempotent.
 */
export async function getOrCreateProjectAccount(
  projectId: string,
): Promise<AccountRecord> {
  return createAccountPort(getDb()).provision({
    projectId,
    slug: "workspace",
    name: "Workspace",
  });
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
