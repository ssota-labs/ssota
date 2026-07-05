import type { Worker } from "@ssota/contracts";
import { readWorkerPermissions } from "@ssota/contracts";
import type { WorkerExecutionScope } from "@ssota/agent-runtime/workers/worker-sdk-host";
import {
  getCachedOrganizationIdForTeamspace,
  resolveOrganizationIdForTeamspace,
  registerTeamspaceOrganization,
  getDb,
} from "@/lib/ports";
import { createWorkerSdkHost } from "./create-worker-sdk-host";
import {
  mintWorkerExecutionSession,
} from "./worker-execution-sessions";

function workerSdkBridgeUrl(): string | undefined {
  const base =
    process.env.SSOTA_WEB_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);
  if (!base) return undefined;
  return `${base.replace(/\/$/, "")}/api/workers/internal/sdk`;
}

export async function buildWorkerExecutionScope(input: {
  worker: Worker;
  accountId?: string | null;
  dryRun?: boolean;
}): Promise<{ scope: WorkerExecutionScope; token: string }> {
  const { worker, accountId = null, dryRun = false } = input;
  let organizationId = getCachedOrganizationIdForTeamspace(worker.teamspaceId);
  if (!organizationId) {
    organizationId = await resolveOrganizationIdForTeamspace(getDb(), worker.teamspaceId);
    registerTeamspaceOrganization(worker.teamspaceId, organizationId);
  }

  const permissions = readWorkerPermissions(worker);
  const host = createWorkerSdkHost({
    teamspaceId: worker.teamspaceId,
    accountId,
    organizationId,
    permissions,
  });

  const session = {
    teamspaceId: worker.teamspaceId,
    accountId,
    organizationId,
    permissions,
    dryRun,
  };

  const token = mintWorkerExecutionSession(session);

  return {
    scope: {
      teamspaceId: worker.teamspaceId,
      accountId,
      organizationId,
      host,
      sdkBridgeUrl: workerSdkBridgeUrl(),
    },
    token,
  };
}
