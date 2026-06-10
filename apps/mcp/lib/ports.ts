import { createActionPorts, createDb } from "@loopos/adapter-supabase";

let cachedPorts: ReturnType<typeof createActionPorts> | null = null;

export function getActionPorts() {
  if (!cachedPorts) {
    const { db } = createDb(process.env.DATABASE_URL);
    cachedPorts = createActionPorts(db);
  }
  return cachedPorts;
}
