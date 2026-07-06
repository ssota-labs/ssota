import { randomUUID } from "node:crypto";
import type { WorkerPermissions } from "@ssota/contracts";

export type WorkerExecutionSession = {
  teamspaceId: string;
  accountId: string | null;
  organizationId: string;
  permissions: WorkerPermissions;
  dryRun: boolean;
  expiresAt: number;
};

const SESSION_TTL_MS = 10 * 60 * 1000;
const sessions = new Map<string, WorkerExecutionSession>();

function pruneExpired(now = Date.now()): void {
  for (const [token, session] of sessions) {
    if (session.expiresAt <= now) sessions.delete(token);
  }
}

export function mintWorkerExecutionSession(
  input: Omit<WorkerExecutionSession, "expiresAt">,
): string {
  pruneExpired();
  const token = randomUUID();
  sessions.set(token, {
    ...input,
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
  return token;
}

export function consumeWorkerExecutionSession(
  token: string,
): WorkerExecutionSession | null {
  pruneExpired();
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }
  return session;
}

export function revokeWorkerExecutionSession(token: string): void {
  sessions.delete(token);
}
