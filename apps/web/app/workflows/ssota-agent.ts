import { getWorkflowMetadata } from "workflow";
import {
  createSandboxSession,
  getDb,
  getTaskPort,
  resolveCredentialProvider,
  runAgentForTask,
  type RunAgentForTaskResult,
  type SandboxSession,
} from "@ssota/agent-runtime";
import { createAgentRunPort } from "@ssota/adapter-supabase";

/** Workflow keys whose runs get a sandbox for code/build tools (Phase 4). */
const DEV_CAPABLE_WORKFLOW_KEYS = new Set(["work.implement_feature"]);

export interface RunSsotaAgentInput {
  projectId: string;
  taskId: string;
  /** End-user data partition (Phase 5). Undefined = builder/shared scope. */
  accountId?: string;
  modelId?: string;
  maxSteps?: number;
}

const TERMINAL_STATUSES = new Set([
  "done",
  "blocked",
  "cancelled",
  "failed",
]);

/**
 * Durable agent run for a single SSOTA task. The agent decides the terminal
 * status itself via the `complete_task` / `block_task` tools; this workflow
 * only claims `running`, executes the loop durably, and finalizes telemetry
 * (with a `failed` safety net if the agent left the task non-terminal).
 */
export async function runSsotaAgentWorkflow(input: RunSsotaAgentInput) {
  "use workflow";

  const { workflowRunId } = getWorkflowMetadata();

  await claimRunning(input, workflowRunId);
  const result = await runAgentStep(input, workflowRunId);
  await finalizeRun(input, workflowRunId, result);

  return result;
}

async function claimRunning(
  input: RunSsotaAgentInput,
  workflowRunId: string,
): Promise<void> {
  "use step";
  console.log(
    `[ssota-agent] claim running task=${input.taskId} run=${workflowRunId}`,
  );
  const db = getDb();
  await createAgentRunPort(db).start({
    projectId: input.projectId,
    taskId: input.taskId,
    workflowRunId,
    accountId: input.accountId ?? null,
    model: input.modelId ?? null,
  });
  await getTaskPort(input.projectId).updateTask(input.taskId, {
    status: "running",
  });
}

async function runAgentStep(
  input: RunSsotaAgentInput,
  workflowRunId: string,
): Promise<RunAgentForTaskResult> {
  "use step";
  console.log(
    `[ssota-agent] run loop task=${input.taskId} run=${workflowRunId}`,
  );

  // Dev-capable tasks get a sandbox so code/build tools are available. The
  // agent runs OUTSIDE the sandbox. Provisioning degrades gracefully when the
  // SDK or Vercel credentials are absent (the run just has no sandbox tools).
  const task = await getTaskPort(input.projectId).getTask(input.taskId);
  let sandbox: SandboxSession | undefined;
  if (task && DEV_CAPABLE_WORKFLOW_KEYS.has(task.workflowKey)) {
    try {
      sandbox = await createSandboxSession();
      console.log(`[ssota-agent] sandbox provisioned run=${workflowRunId}`);
    } catch (error) {
      console.warn(`[ssota-agent] sandbox unavailable: ${String(error)}`);
    }
  }

  // External-service tools (Vercel Connect / env connectors) attach when a
  // credential provider is configured for this deployment.
  const credentials = resolveCredentialProvider();

  try {
    return await runAgentForTask({
      projectId: input.projectId,
      taskId: input.taskId,
      runId: workflowRunId,
      accountId: input.accountId,
      modelId: input.modelId,
      sandbox,
      credentials,
      maxSteps: input.maxSteps,
    });
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

async function finalizeRun(
  input: RunSsotaAgentInput,
  workflowRunId: string,
  result: RunAgentForTaskResult,
): Promise<void> {
  "use step";
  console.log(
    `[ssota-agent] finalize task=${input.taskId} run=${workflowRunId} finishReason=${result.finishReason} finalStatus=${result.finalStatus}`,
  );
  const db = getDb();

  // Safety net: if the agent ended without driving the task to a terminal
  // state, mark it failed so it never hangs in `running`.
  const isTerminal = result.finalStatus
    ? TERMINAL_STATUSES.has(result.finalStatus)
    : false;
  if (!isTerminal) {
    await getTaskPort(input.projectId).updateTask(input.taskId, {
      status: "failed",
      result: { reason: "Agent ended without completing the task", ...result },
    });
  }

  const finalTask = await getTaskPort(input.projectId).getTask(input.taskId);
  await createAgentRunPort(db).finish(workflowRunId, {
    status: finalTask?.status ?? "failed",
    usage: result.usage ?? {},
  });
}
