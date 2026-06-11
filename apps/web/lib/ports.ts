import {
  createActionPorts,
  createConsolePort,
  createDb,
} from "@loopos/adapter-supabase";

let cachedPorts: ReturnType<typeof createActionPorts> | null = null;
let cachedConsolePort: ReturnType<typeof createConsolePort> | null = null;

function getDb() {
  return createDb(process.env.DATABASE_URL).db;
}

export function getActionPorts() {
  if (!cachedPorts) {
    cachedPorts = createActionPorts(getDb());
  }
  return cachedPorts;
}

export function getConsolePort() {
  if (!cachedConsolePort) {
    cachedConsolePort = createConsolePort(getDb());
  }
  return cachedConsolePort;
}
