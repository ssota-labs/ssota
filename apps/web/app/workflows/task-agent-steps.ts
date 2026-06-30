import type { ModelMessage, SystemModelMessage } from "ai";
import {
  getDb,
  getTaskPort,
  buildRunPrompt,
  createSandboxSession,
  attachSandboxSession,
  toolBundlesForAgentKey,
} from "@ssota/agent-runtime";
import { createAgentRunPort } from "@ssota/adapter-postgres";

/** Agent keys whose runs get a sandbox when tool_bundles includes sandbox.code. */
const DEV_CAPABLE_AGENT_KEYS = new Set(["specialist.implement_feature"]);

function agentNeedsSandbox(agentKey: string | null | undefined): boolean {
  if (!agentKey) return false;
  if (DEV_CAPABLE_AGENT_KEYS.has(agentKey)) return true;
  return toolBundlesForAgentKey(agentKey).includes("sandbox.code");
}

/**
 * Durable steps shared by the two task-runtime entry points: runTaskAgentWorkflow
 * (dispatch/cron) and runSsotaAgentWorkflow (agent run/gate, job-runner path).
 * Both are runtimeKind="task" with identical claim/prompt/finalize logic.
 */

export interface RunTaskAgentInput {
  teamspaceId: string;
  taskId: string;
  accountId?: string;
  scheduleId?: string;
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
    teamspaceId: input.teamspaceId,
    runtimeKind: "task",
    taskId: input.taskId,
    scheduleId: input.scheduleId ?? null,
    workflowRunId,
    accountId: input.accountId ?? null,
    model: input.modelId ?? null,
    trigger: input.scheduleId ? "schedule" : "task",
  });
  await getTaskPort(input.teamspaceId, input.accountId).updateTask(input.taskId, {
    status: "running",
  });
}

export async function buildTaskPromptStep(
  input: RunTaskAgentInput,
  workflowRunId: string,
): Promise<{ instructions: SystemModelMessage[]; messages: ModelMessage[] }> {
  "use step";
  return buildRunPrompt({
    teamspaceId: input.teamspaceId,
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
  const taskPort = getTaskPort(input.teamspaceId, input.accountId);
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

/**
 * Provision a sandbox for dev-capable task runs and return its id (serializable,
 * carried in the run scope). Returns undefined when the task is not dev-capable
 * or provisioning fails (sandbox tools simply stay unavailable). Done in its own
 * `"use step"` so the live session is never carried across step boundaries.
 */
export async function provisionSandboxStep(
  input: RunTaskAgentInput,
): Promise<string | undefined> {
  "use step";
  const task = await getTaskPort(input.teamspaceId, input.accountId).getTask(
    input.taskId,
  );
  if (
    !task?.agentKey ||
    !agentNeedsSandbox(task.agentKey)
  ) {
    return undefined;
  }
  try {
    const sandbox = await createSandboxSession();
    return sandbox.sandboxId || undefined;
  } catch {
    return undefined; // sandbox optional — run continues without it
  }
}

/** Stop a provisioned sandbox (best-effort) at the end of the run. */
export async function stopSandboxStep(sandboxId: string): Promise<void> {
  "use step";
  try {
    const sandbox = await attachSandboxSession(sandboxId);
    await sandbox.stop();
  } catch {
    // best-effort teardown
  }
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
