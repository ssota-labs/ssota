import {
  createConsolePort,
  createDb,
  createOnboardingPort,
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

export function getConsolePort() {
  return createConsolePort(getDb());
}

export function getOnboardingPort() {
  return createOnboardingPort(getDb());
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
