import type { Db } from "@ssota/adapter-postgres";
import {
  createAgentRunPort,
  listBuilderWorkersByKind,
} from "@ssota/adapter-postgres";
import { WorkerSyncConfigSchema } from "@ssota/contracts";
import { executeScopedWorker } from "@/lib/workers/execute-scoped-worker";
import { shouldRunNow } from "@/lib/schedules/should-run-now";

const TICK_MS = 60_000;

/**
 * Fan out due sync-kind workers (cron in kind_config). Runs without an LLM —
 * sandbox execution only.
 */
export async function fanOutSyncWorkers(
  db: Db,
  now: Date = new Date(),
): Promise<{ started: string[]; skipped: string[] }> {
  const agentRunPort = createAgentRunPort(db);
  const workers = await listBuilderWorkersByKind(db, "sync");

  const started: string[] = [];
  const skipped: string[] = [];

  for (const worker of workers) {
    const syncConfig = WorkerSyncConfigSchema.safeParse(worker.kindConfig);
    if (!syncConfig.success || !syncConfig.data.enabled) {
      skipped.push(worker.id);
      continue;
    }

    const { run, fire } = shouldRunNow(
      syncConfig.data.cronExpression,
      syncConfig.data.timezone,
      now,
      TICK_MS,
    );
    if (!run || !fire) {
      skipped.push(worker.id);
      continue;
    }

    const workflowRunId = `worker-sync:${worker.id}:${fire.toISOString()}`;
    const existing = await agentRunPort.hasWorkflowRun(workflowRunId);
    if (existing) {
      skipped.push(worker.id);
      continue;
    }

    await agentRunPort.start({
      teamspaceId: worker.teamspaceId,
      workflowRunId,
      runtimeKind: "worker",
      trigger: "schedule",
    });

    const result = await executeScopedWorker({
      worker,
      input: {},
      trigger: "schedule",
    });

    await agentRunPort.finish(workflowRunId, {
      status: result.ok ? "completed" : "failed",
      usage: {
        workerKey: worker.key,
        output: result.output,
        error: result.error,
      },
    });

    started.push(worker.key);
  }

  return { started, skipped };
}
