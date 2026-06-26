import {
  createDb,
  createGraphPorts,
  createDbCatalogWritePort,
  createTaskPort,
  createWorkflowInstructionPort,
  createPagePort,
  createConsolePort,
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

export function getGraphPorts(projectId: string, accountId?: string) {
  return createGraphPorts(getDb(), { projectId, accountId });
}

export function getGraphReadPort(projectId: string, accountId?: string) {
  return getGraphPorts(projectId, accountId).graphRead;
}

/** Catalog (node/edge type) write port. Catalog is project-wide (no account). */
export function getCatalogWritePort(projectId: string) {
  return createDbCatalogWritePort(getDb(), { projectId });
}

export function getWorkflowInstructionPort(projectId: string, accountId?: string) {
  return createWorkflowInstructionPort(getDb(), { projectId, accountId });
}

export function getPagePort(projectId: string, accountId?: string) {
  return createPagePort(getDb(), { projectId, accountId });
}

export function getConsolePort() {
  return createConsolePort(getDb());
}

/** Resolve the owning organization id for a project, or null if not found. */
export async function resolveOrgIdForProject(
  projectId: string,
): Promise<string | null> {
  const project = await getConsolePort().getProjectById(projectId);
  return project?.organizationId ?? null;
}
