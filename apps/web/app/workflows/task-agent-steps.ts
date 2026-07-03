import type { ModelMessage, SystemModelMessage } from "ai";
import type { SandboxAccessTier, ToolBundle } from "@ssota/contracts";
import {
  BUILTIN_AGENT_IDS,
  getAgentDefinitionById,
} from "@ssota/contracts/agents";
import {
  getDb,
  getTaskPort,
  resolveRunAgent,
  getAgentDefinitionPort,
  getSandboxEnvironmentPort,
  getSandboxSessionPort,
} from "@ssota/agent-runtime";
import { createAgentRunPort } from "@ssota/adapter-postgres";

const DEFAULT_SANDBOX_ENV_KEY = "sandbox.dev_node24";

function resolveSandboxAccess(
  toolBundles: ToolBundle[],
  runPolicy: { sandboxAccess?: SandboxAccessTier } | undefined,
): SandboxAccessTier {
  if (runPolicy?.sandboxAccess) return runPolicy.sandboxAccess;
  if (toolBundles.includes("sandbox.code")) return "code";
  return "none";
}

function agentNeedsSandbox(
  toolBundles: ToolBundle[],
  sandboxPolicy: "none" | "optional" | "required" | undefined,
): boolean {
  if (sandboxPolicy === "required" || sandboxPolicy === "optional") return true;
  if (!sandboxPolicy || sandboxPolicy === "none") {
    return toolBundles.includes("sandbox.code");
  }
  return false;
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

async function resolveAgentRunPolicy(
  teamspaceId: string,
  accountId: string | undefined,
  agentDefinitionId: string | null | undefined,
) {
  if (!agentDefinitionId) return {};
  const builtin = getAgentDefinitionById(agentDefinitionId);
  if (builtin) return builtin.runPolicy ?? {};
  const row = await getAgentDefinitionPort(teamspaceId, accountId).getById(
    agentDefinitionId,
  );
  return row?.runPolicy ?? {};
}

async function resolveSandboxEnvironmentId(
  teamspaceId: string,
  taskSandboxEnvironmentId: string | null | undefined,
): Promise<string> {
  const envPort = getSandboxEnvironmentPort(teamspaceId);
  if (taskSandboxEnvironmentId) {
    const env = await envPort.getById(taskSandboxEnvironmentId);
    if (env) return env.id;
  }
  const defaultEnv = await envPort.getByKey(DEFAULT_SANDBOX_ENV_KEY);
  if (defaultEnv) return defaultEnv.id;
  const created = await envPort.upsertEnvironment({
    key: DEFAULT_SANDBOX_ENV_KEY,
    name: "Dev Node 24",
    description: "Default empty Node 24 sandbox for coding agents",
    runtime: "node24",
    workingRoot: "/vercel/sandbox",
  });
  return created.id;
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

export interface ProvisionSandboxResult {
  sandboxSessionId?: string;
  sandboxAccess: SandboxAccessTier;
}

/**
 * Provision a sandbox session for dev-capable task runs. Returns the DB session
 * id (serializable) and access tier for tool filtering.
 */
export async function provisionSandboxStep(
  input: RunTaskAgentInput,
  workflowRunId: string,
): Promise<ProvisionSandboxResult> {
  "use step";
  const task = await getTaskPort(input.teamspaceId, input.accountId).getTask(
    input.taskId,
  );
  const toolBundles = await resolveAgentToolBundles(
    input.teamspaceId,
    input.accountId,
    task?.agentDefinitionId,
  );
  const runPolicy = await resolveAgentRunPolicy(
    input.teamspaceId,
    input.accountId,
    task?.agentDefinitionId,
  );
  const sandboxAccess = resolveSandboxAccess(toolBundles, runPolicy);
  const needsSandbox = agentNeedsSandbox(toolBundles, runPolicy.sandboxPolicy);

  if (!task?.agentDefinitionId || !needsSandbox) {
    return { sandboxAccess };
  }

  try {
    const environmentId = await resolveSandboxEnvironmentId(
      input.teamspaceId,
      task.sandboxEnvironmentId ?? undefined,
    );
    const sessionPort = getSandboxSessionPort(input.teamspaceId);
    const session = await sessionPort.provision({
      sandboxEnvironmentId: environmentId,
      ownerAgentRunId: null,
      ownerTaskId: input.taskId,
    });
    return {
      sandboxSessionId: session.id,
      sandboxAccess,
    };
  } catch (error) {
    if (runPolicy.sandboxPolicy === "required") {
      throw error;
    }
    return { sandboxAccess };
  }
}

/** Stop a provisioned sandbox session (best-effort) at the end of the run. */
export async function stopSandboxStep(sandboxSessionId: string, teamspaceId: string): Promise<void> {
  "use step";
  try {
    await getSandboxSessionPort(teamspaceId).stop(sandboxSessionId);
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
