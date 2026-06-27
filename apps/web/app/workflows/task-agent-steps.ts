import type { ModelMessage, SystemModelMessage } from "ai";
import { getDb, getTaskPort, buildRunPrompt } from "@ssota/agent-runtime";
import { createAgentRunPort } from "@ssota/adapter-postgres";

/**
 * Durable steps shared by the two task-runtime entry points: runTaskAgentWorkflow
 * (dispatch/cron) and runSsotaAgentWorkflow (agent run/gate, job-runner path).
 * Both are runtimeKind="task" with identical claim/prompt/finalize logic.
 */

export interface RunTaskAgentInput {
  projectId: string;
  taskId: string;
  accountId?: string;
  modelId?: string;
  maxSteps?: number;
}

const TERMINAL_STATUSES = new Set(["done", "blocked", "cancelled", "failed"]);

export async function claimTaskRun(
  input: RunTaskAgentInput,
  workflowRunId: string,
): Promise<void> {
  "use step";
  await createAgentRunPort(getDb()).start({
    projectId: input.projectId,
    runtimeKind: "task",
    taskId: input.taskId,
    workflowRunId,
    accountId: input.accountId ?? null,
    model: input.modelId ?? null,
  });
  await getTaskPort(input.projectId, input.accountId).updateTask(input.taskId, {
    status: "running",
  });
}

export async function buildTaskPromptStep(
  input: RunTaskAgentInput,
  workflowRunId: string,
): Promise<{ instructions: SystemModelMessage[]; messages: ModelMessage[] }> {
  "use step";
  return buildRunPrompt({
    projectId: input.projectId,
    runId: workflowRunId,
    runtimeKind: "task",
    taskId: input.taskId,
    accountId: input.accountId,
    modelId: input.modelId,
    maxSteps: input.maxSteps,
  });
}

export async function finalizeTaskRun(
  input: RunTaskAgentInput,
  workflowRunId: string,
  usage: { inputTokens?: number; outputTokens?: number; totalTokens?: number },
): Promise<void> {
  "use step";
  const taskPort = getTaskPort(input.projectId, input.accountId);
  const current = await taskPort.getTask(input.taskId);
  const isTerminal = current?.status
    ? TERMINAL_STATUSES.has(current.status)
    : false;
  if (!isTerminal) {
    await taskPort.updateTask(input.taskId, {
      status: "failed",
      result: { reason: "Agent ended without completing the task" },
    });
  }
  const finalTask = await taskPort.getTask(input.taskId);
  await createAgentRunPort(getDb()).finish(workflowRunId, {
    status: finalTask?.status ?? "failed",
    usage,
  });
}

/** Sum per-step token usage into a single record. */
export function sumStepUsage(
  steps: ReadonlyArray<{
    usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
  }>,
): { inputTokens: number; outputTokens: number; totalTokens: number } {
  return steps.reduce(
    (acc, step) => ({
      inputTokens: acc.inputTokens + (step.usage?.inputTokens ?? 0),
      outputTokens: acc.outputTokens + (step.usage?.outputTokens ?? 0),
      totalTokens: acc.totalTokens + (step.usage?.totalTokens ?? 0),
    }),
    { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
  );
}
