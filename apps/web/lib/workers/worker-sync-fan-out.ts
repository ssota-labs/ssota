import { and, eq, isNull } from "drizzle-orm";
import type { Db } from "@ssota/adapter-postgres";
import { schema, createAgentRunPort } from "@ssota/adapter-postgres";
import { WorkerSyncConfigSchema, WorkerSchema } from "@ssota/contracts";
import { executeWorker } from "@ssota/agent-runtime/workers/execute-worker";
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
  const rows = await db
    .select()
    .from(schema.workers)
    .where(
      and(eq(schema.workers.kind, "sync"), isNull(schema.workers.accountId)),
    );

  const started: string[] = [];
  const skipped: string[] = [];

  for (const row of rows) {
    const syncConfig = WorkerSyncConfigSchema.safeParse(row.kindConfig);
    if (!syncConfig.success || !syncConfig.data.enabled) {
      skipped.push(row.id);
      continue;
    }

    const { run, fire } = shouldRunNow(
      syncConfig.data.cronExpression,
      syncConfig.data.timezone,
      now,
      TICK_MS,
    );
    if (!run || !fire) {
      skipped.push(row.id);
      continue;
    }

    const workflowRunId = `worker-sync:${row.id}:${fire.toISOString()}`;
    const existing = await agentRunPort.hasWorkflowRun(workflowRunId);
    if (existing) {
      skipped.push(row.id);
      continue;
    }

    await agentRunPort.start({
      teamspaceId: row.teamspaceId,
      workflowRunId,
      runtimeKind: "worker",
      trigger: "schedule",
    });

    const worker = WorkerSchema.parse({
      id: row.id,
      teamspaceId: row.teamspaceId,
      accountId: row.accountId,
      key: row.key,
      name: row.name,
      description: row.description,
      kind: row.kind,
      inputSchema: row.inputSchema,
      outputSchema: row.outputSchema,
      script: row.script,
      runtime: row.runtime,
      kindConfig: row.kindConfig,
      version: row.version,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });

    const result = await executeWorker({
      worker,
      input: {},
      trigger: "schedule",
    });

    await agentRunPort.finish(workflowRunId, {
      status: result.ok ? "completed" : "failed",
      usage: { workerKey: row.key, output: result.output, error: result.error },
    });

    started.push(row.key);
  }

  return { started, skipped };
}
