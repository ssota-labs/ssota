import {
  createConsolePort,
  createGraphPorts,
  createDb,
  createTaskPort,
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

export function getGraphPorts(projectId: string) {
  return createGraphPorts(getDb(), { projectId });
}

export async function resolveDefaultProjectId(): Promise<string> {
  const consolePort = createConsolePort(getDb());
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
