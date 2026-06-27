import { getWorkflowMetadata } from "workflow";
import type { ModelMessage, SystemModelMessage } from "ai";
import { getDb, getTaskPort, buildRunPrompt } from "@ssota/agent-runtime";
import { buildMainWorkflowAgent } from "@ssota/agent-runtime/workflow";
import { createAgentRunPort } from "@ssota/adapter-postgres";
import { dispatchMainTool } from "./main-workflow-agent-dispatch";

export interface RunTaskAgentInput {
  projectId: string;
  taskId: string;
  accountId?: string;
  modelId?: string;
  maxSteps?: number;
}

const TERMINAL_STATUSES = new Set(["done", "blocked", "cancelled", "failed"]);

/**
 * WorkflowAgent-backed task agent. Durable shape: claim (+ mark running) →
 * build prompt → agent loop (per-tool durable steps) → finalize (resolve task
 * status). Background run — the stream is not consumed by a client.
 *
 * NOTE: sandbox (dev-capable) tools are not yet wired into the WorkflowAgent
 * task path; that needs per-step `Sandbox.get` re-attach (follow-up R4). Most
 * tasks do not provision a sandbox.
 */
export async function runTaskAgentWorkflow(input: RunTaskAgentInput) {
  "use workflow";

  const { workflowRunId } = getWorkflowMetadata();
  await claimRunning(input, workflowRunId);

  const { instructions, messages } = await buildTaskPrompt(input, workflowRunId);

  const agent = buildMainWorkflowAgent({
    ssota: {
      projectId: input.projectId,
      taskId: input.taskId,
      runId: workflowRunId,
      accountId: input.accountId,
    },
    dispatch: dispatchMainTool,
    instructions,
    modelId: input.modelId,
    maxSteps: input.maxSteps,
  });

  const result = await agent.stream({ messages });

  const usage = result.steps.reduce(
    (acc, step) => ({
      inputTokens: (acc.inputTokens ?? 0) + (step.usage?.inputTokens ?? 0),
      outputTokens: (acc.outputTokens ?? 0) + (step.usage?.outputTokens ?? 0),
      totalTokens: (acc.totalTokens ?? 0) + (step.usage?.totalTokens ?? 0),
    }),
    { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
  );
  await finalizeRun(input, workflowRunId, usage);

  return { messageCount: result.messages.length, stepCount: result.steps.length };
}

async function claimRunning(
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

async function buildTaskPrompt(
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

async function finalizeRun(
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
