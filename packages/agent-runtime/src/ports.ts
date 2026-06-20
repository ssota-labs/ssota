import {
  createDb,
  createGraphPorts,
  createTaskPort,
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

export function getTaskPort(projectId: string) {
  return createTaskPort(getDb(), { projectId });
}

export function getGraphPorts(projectId: string) {
  return createGraphPorts(getDb(), { projectId });
}

export function getGraphReadPort(projectId: string) {
  return getGraphPorts(projectId).graphRead;
}
