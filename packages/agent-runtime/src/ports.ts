import {
  createDb,
  createGraphPorts,
  createMainInstructionPointerPort,
  createTaskPort,
  createWorkflowInstructionPort,
  createPagePort,
} from "@ssota/adapter-supabase";

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

export function getWorkflowInstructionPort(projectId: string, accountId?: string) {
  return createWorkflowInstructionPort(getDb(), { projectId, accountId });
}

export function getMainInstructionPointerPort() {
  return createMainInstructionPointerPort(getDb());
}

export function getPagePort(projectId: string, accountId?: string) {
  return createPagePort(getDb(), { projectId, accountId });
}
