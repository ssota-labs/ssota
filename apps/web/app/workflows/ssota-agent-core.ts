import {
  createSandboxSession,
  getDb,
  getTaskPort,
  streamAgent,
  type RunAgentResult,
  type SandboxSession,
  type UIMessageChunk,
} from "@ssota/agent-runtime";
import { createAgentRunPort } from "@ssota/adapter-postgres";

/**
 * Pure agent-run logic shared by every {@link JobRunner}. Contains **no**
 * Vercel Workflow DevKit (WDK) imports — the durable EE runner
 * (`ssota-agent.ee.ts`) wraps these functions in `"use step"` boundaries, while
 * the OSS inline runner calls {@link runSsotaAgentCore} directly. The caller
 * supplies the `runId` and the `writable` so this module stays decoupled from
 * how the run is scheduled or how chunks are delivered.
 */

/** Workflow instruction keys whose runs get a sandbox for code/build tools. */
const DEV_CAPABLE_WORKFLOW_KEYS = new Set(["work.implement_feature"]);

export interface RunSsotaAgentInput {
  teamspaceId: string;
  taskId: string;
  /** End-user data partition (Phase 5). Undefined = builder/shared scope. */
  accountId?: string;
  modelId?: string;
  maxSteps?: number;
}

const TERMINAL_STATUSES = new Set(["done", "blocked", "cancelled", "failed"]);

export async function claimRunning(
  input: RunSsotaAgentInput,
  runId: string,
): Promise<void> {
  console.log(`[ssota-agent] claim running task=${input.taskId} run=${runId}`);
  const db = getDb();
  await createAgentRunPort(db).start({
    teamspaceId: input.teamspaceId,
    runtimeKind: "task",
    taskId: input.taskId,
    workflowRunId: runId,
    accountId: input.accountId ?? null,
    model: input.modelId ?? null,
  });
  await getTaskPort(input.teamspaceId, input.accountId).updateTask(input.taskId, {
    status: "running",
  });
}

/**
 * Run the durable agent loop, streaming UI message chunks to `writable`. The
 * writable is provided by the caller — the EE runner passes the WDK
 * `getWritable()` stream; the inline runner passes a `TransformStream`. This
 * function never closes the writable (the caller owns its lifecycle).
 */
export async function runAgentStepCore(
  input: RunSsotaAgentInput,
  runId: string,
  writable: WritableStream<UIMessageChunk>,
): Promise<RunAgentResult> {
  console.log(`[ssota-agent] run loop task=${input.taskId} run=${runId}`);

  const task = await getTaskPort(input.teamspaceId, input.accountId).getTask(
    input.taskId,
  );
  let sandbox: SandboxSession | undefined;
  if (
    task?.workflowInstructionKey &&
    DEV_CAPABLE_WORKFLOW_KEYS.has(task.workflowInstructionKey)
  ) {
    try {
      sandbox = await createSandboxSession();
      console.log(`[ssota-agent] sandbox provisioned run=${runId}`);
    } catch (error) {
      console.warn(`[ssota-agent] sandbox unavailable: ${String(error)}`);
    }
  }

  try {
    return await streamAgent(
      {
        teamspaceId: input.teamspaceId,
        taskId: input.taskId,
        runId,
        runtimeKind: "task",
        accountId: input.accountId,
        modelId: input.modelId,
        sandbox,
        maxSteps: input.maxSteps,
      },
      writable,
    );
  } finally {
    if (sandbox) {
      try {
        await sandbox.stop();
      } catch {
        // best-effort teardown
      }
    }
  }
}

export async function finalizeRun(
  input: RunSsotaAgentInput,
  runId: string,
  result: RunAgentResult,
): Promise<void> {
  console.log(
    `[ssota-agent] finalize task=${input.taskId} run=${runId} finishReason=${result.finishReason} finalStatus=${result.finalStatus}`,
  );
  const db = getDb();

  const isTerminal = result.finalStatus
    ? TERMINAL_STATUSES.has(result.finalStatus)
    : false;
  if (!isTerminal) {
    await getTaskPort(input.teamspaceId, input.accountId).updateTask(input.taskId, {
      status: "failed",
      result: { reason: "Agent ended without completing the task", ...result },
    });
  }

  const finalTask = await getTaskPort(input.teamspaceId, input.accountId).getTask(
    input.taskId,
  );
  await createAgentRunPort(db).finish(runId, {
    status: finalTask?.status ?? "failed",
    usage: result.usage ?? {},
  });
}

/**
 * Inline (non-durable) sequence: claim → run → finalize. Used by the OSS
 * {@link JobRunner}. The caller owns `writable` and must close it once this
 * resolves so the readable side terminates.
 */
export async function runSsotaAgentCore(
  input: RunSsotaAgentInput,
  runId: string,
  writable: WritableStream<UIMessageChunk>,
): Promise<RunAgentResult> {
  await claimRunning(input, runId);
  const result = await runAgentStepCore(input, runId, writable);
  await finalizeRun(input, runId, result);
  return result;
}
