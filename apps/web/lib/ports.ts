import {
  createActionPorts,
  createConsolePort,
  createDb,
  createOnboardingPort,
} from "@ssota/adapter-supabase";

let cachedPorts: ReturnType<typeof createActionPorts> | null = null;
let cachedConsolePort: ReturnType<typeof createConsolePort> | null = null;
let cachedOnboardingPort: ReturnType<typeof createOnboardingPort> | null = null;

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

export function getOnboardingPort() {
  if (!cachedOnboardingPort) {
    cachedOnboardingPort = createOnboardingPort(getDb());
  }
  return cachedOnboardingPort;
}
