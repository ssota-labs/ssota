import { getWorkflowMetadata } from "workflow";
import type { ModelMessage, SystemModelMessage } from "ai";
import { getDb, getTaskPort, buildRunPrompt } from "@ssota/agent-runtime";
import { buildMainWorkflowAgent } from "@ssota/agent-runtime/workflow";
import { createAgentRunPort } from "@ssota/adapter-postgres";
import { dispatchMainTool } from "./main-workflow-agent-dispatch";
import type { RunSsotaAgentInput } from "./ssota-agent-core";

/**
 * Durable task agent run on the WorkflowAgent (job-runner path,
 * JOB_RUNNER=workflow). Functionally identical to runTaskAgentWorkflow — same
 * runtimeKind=task shape: claim → buildRunPrompt → agent loop (per-tool durable
 * steps) → finalize. Kept under this name so workflow-job-runner.ee is
 * unchanged; deduped with task-agent during the inline-removal cleanup.
 */
export type { RunSsotaAgentInput };

const TERMINAL_STATUSES = new Set(["done", "blocked", "cancelled", "failed"]);

export async function runSsotaAgentWorkflow(input: RunSsotaAgentInput) {
  "use workflow";

  const { workflowRunId } = getWorkflowMetadata();
  await claimRunningStep(input, workflowRunId);

  const { instructions, messages } = await buildTaskPromptStep(
    input,
    workflowRunId,
  );

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
  await finalizeStep(input, workflowRunId, usage);

  return result;
}

async function claimRunningStep(
  input: RunSsotaAgentInput,
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

async function buildTaskPromptStep(
  input: RunSsotaAgentInput,
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

async function finalizeStep(
  input: RunSsotaAgentInput,
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
