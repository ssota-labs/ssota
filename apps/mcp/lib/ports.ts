import {
  createActionPorts,
  createConsolePort,
  createDb,
} from "@ssota/adapter-supabase";

type Db = ReturnType<typeof createDb>["db"];

export function getDb(): Db {
  return createDb(process.env.DATABASE_URL).db;
}

export function getActionPorts(projectId: string) {
  return createActionPorts(getDb(), { projectId });
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
