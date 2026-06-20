import { getWorkflowMetadata } from "workflow";
import {
  getDb,
  getTaskPort,
  runAgentForTask,
  type RunAgentForTaskResult,
} from "@ssota/agent-runtime";
import { createAgentRunPort } from "@ssota/adapter-supabase";

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
  return runAgentForTask({
    projectId: input.projectId,
    taskId: input.taskId,
    runId: workflowRunId,
    accountId: input.accountId,
    modelId: input.modelId,
    maxSteps: input.maxSteps,
  });
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
