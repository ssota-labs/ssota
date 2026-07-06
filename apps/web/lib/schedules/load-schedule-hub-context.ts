import { WorkerSyncConfigSchema } from "@ssota/contracts";
import type { Schedule } from "@ssota/contracts";
import { loadAgentDefinitionsForUi } from "@/lib/console/load-agents-for-ui";
import { getOrCreateProjectAccount, getSchedulePort, getWorkerPort } from "@/lib/ports";

export type ScheduleHubAgentSchedule = {
  id: string;
  agentDefinitionId: string;
  targetType: Schedule["targetType"];
  cronExpression: string;
  timezone: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ScheduleHubSyncWorker = {
  id: string;
  key: string;
  name: string;
  description: string;
  cronExpression: string;
  timezone: string;
  enabled: boolean;
};

export type ScheduleHubContext = {
  teamspaceId: string;
  accountId: string;
  schedules: ScheduleHubAgentSchedule[];
  syncWorkers: ScheduleHubSyncWorker[];
  agents: Array<{ id: string; name: string; description: string }>;
};

export async function loadScheduleHubContext(
  teamspaceId: string,
): Promise<ScheduleHubContext> {
  const account = await getOrCreateProjectAccount(teamspaceId);
  const workerPort = getWorkerPort(teamspaceId);

  const [schedules, agents, syncIndices] = await Promise.all([
    getSchedulePort(teamspaceId, account.id).list(),
    loadAgentDefinitionsForUi(teamspaceId),
    workerPort.listWorkers("sync"),
  ]);

  const syncWorkers = (
    await Promise.all(
      syncIndices.map(async (index) => {
        const worker = await workerPort.getById(index.id);
        if (!worker || worker.kind !== "sync") return null;
        const parsed = WorkerSyncConfigSchema.safeParse(worker.kindConfig);
        if (!parsed.success) return null;
        const cfg = parsed.data;
        return {
          id: worker.id,
          key: worker.key,
          name: worker.name,
          description: worker.description,
          cronExpression: cfg.cronExpression,
          timezone: cfg.timezone,
          enabled: cfg.enabled,
        } satisfies ScheduleHubSyncWorker;
      }),
    )
  ).filter((row): row is ScheduleHubSyncWorker => row !== null);

  return {
    teamspaceId,
    accountId: account.id,
    schedules: schedules.map((schedule) => ({
      id: schedule.id,
      agentDefinitionId: schedule.agentDefinitionId,
      targetType: schedule.targetType,
      cronExpression: schedule.cronExpression,
      timezone: schedule.timezone,
      enabled: schedule.enabled,
      createdAt: schedule.createdAt,
      updatedAt: schedule.updatedAt,
    })),
    syncWorkers,
    agents: agents.map((agent) => ({
      id: agent.id,
      name: agent.name,
      description: agent.description,
    })),
  };
}
