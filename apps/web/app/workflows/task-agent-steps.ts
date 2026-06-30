import type { ModelMessage, SystemModelMessage } from "ai";
import type { ToolBundle } from "@ssota/contracts";
import {
  BUILTIN_AGENT_IDS,
  getAgentDefinitionById,
} from "@ssota/contracts/agents";
import {
  getDb,
  getTaskPort,
  resolveRunAgent,
  createSandboxSession,
  attachSandboxSession,
  getAgentDefinitionPort,
} from "@ssota/agent-runtime";
import { createAgentRunPort } from "@ssota/adapter-postgres";

function agentNeedsSandbox(
  agentDefinitionId: string | null | undefined,
  toolBundles: ToolBundle[],
): boolean {
  if (!agentDefinitionId) return false;
  if (agentDefinitionId === BUILTIN_AGENT_IDS.implementFeature) return true;
  return toolBundles.includes("sandbox.code");
}

async function resolveAgentToolBundles(
  teamspaceId: string,
  accountId: string | undefined,
  agentDefinitionId: string | null | undefined,
): Promise<ToolBundle[]> {
  if (!agentDefinitionId) return [];
  const builtin = getAgentDefinitionById(agentDefinitionId);
  if (builtin) return builtin.toolBundles;
  const row = await getAgentDefinitionPort(teamspaceId, accountId).getById(
    agentDefinitionId,
  );
  return row?.toolBundles ?? [];
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
): Promise<{
  instructions: SystemModelMessage[];
  messages: ModelMessage[];
  definition: Awaited<ReturnType<typeof resolveRunAgent>>["definition"];
  trigger: Awaited<ReturnType<typeof resolveRunAgent>>["trigger"];
}> {
  "use step";
  const resolved = await resolveRunAgent({
    teamspaceId: input.teamspaceId,
    runId: workflowRunId,
    runtimeKind: "task",
    taskId: input.taskId,
    accountId: input.accountId,
    scheduleId: input.scheduleId,
    modelId: input.modelId,
    maxSteps: input.maxSteps,
  });
  return {
    instructions: resolved.instructions,
    messages: resolved.messages,
    definition: resolved.definition,
    trigger: resolved.trigger,
  };
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
  const toolBundles = await resolveAgentToolBundles(
    input.teamspaceId,
    input.accountId,
    task?.agentDefinitionId,
  );
  if (
    !task?.agentDefinitionId ||
    !agentNeedsSandbox(task.agentDefinitionId, toolBundles)
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
