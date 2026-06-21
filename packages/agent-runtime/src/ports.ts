import {
  createDb,
  createGraphPorts,
  createTaskPort,
  createWorkflowPort,
} from "@ssota/adapter-supabase";

type Db = ReturnType<typeof createDb>["db"];

let cachedDb: Db | undefined;

/**
 * Lazily-created singleton DB handle. Mirrors `apps/mcp/lib/ports.ts` so the
 * agent runtime and the MCP server compose the same ports over the same core
 * use-cases — no duplicated query logic.
 */
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

export function getWorkflowPort(projectId: string, accountId?: string) {
  return createWorkflowPort(getDb(), { projectId, accountId });
}
