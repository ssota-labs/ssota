import { getWorkflowMetadata } from "workflow";
import type { ModelMessage, SystemModelMessage } from "ai";
import { getDb, buildRunPrompt } from "@ssota/agent-runtime";
import { buildMainWorkflowAgent } from "@ssota/agent-runtime/workflow";
import { createAgentRunPort } from "@ssota/adapter-postgres";
import { dispatchMainTool } from "./main-workflow-agent-dispatch";
import { resolveTeamspaceOrgScopeStep } from "./teamspace-org-scope-step";

export interface RunSchedulerAgentInput {
  teamspaceId: string;
  scheduleId: string;
  accountId?: string;
  modelId?: string;
  maxSteps?: number;
}

/**
 * WorkflowAgent-backed scheduler (background orchestration) agent. Non-streaming
 * — the run's stream is not consumed by a client. Durable shape:
 * claim → build prompt → agent loop (per-tool steps) → finalize.
 */
export async function runSchedulerAgentWorkflow(input: RunSchedulerAgentInput) {
  "use workflow";

  const { workflowRunId } = getWorkflowMetadata();
  await claimRunning(input, workflowRunId);

  const { instructions, messages } = await buildSchedulerPrompt(
    input,
    workflowRunId,
  );

  const organizationId = await resolveTeamspaceOrgScopeStep(input.teamspaceId);

  const agent = buildMainWorkflowAgent({
    ssota: {
      teamspaceId: input.teamspaceId,
      organizationId,
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
  await finalizeRun(workflowRunId, usage);

  return { messageCount: result.messages.length, stepCount: result.steps.length };
}

async function claimRunning(
  input: RunSchedulerAgentInput,
  workflowRunId: string,
): Promise<void> {
  "use step";
  await createAgentRunPort(getDb()).start({
    teamspaceId: input.teamspaceId,
    runtimeKind: "scheduler",
    scheduleId: input.scheduleId,
    workflowRunId,
    accountId: input.accountId ?? null,
    model: input.modelId ?? null,
  });
}

async function buildSchedulerPrompt(
  input: RunSchedulerAgentInput,
  workflowRunId: string,
): Promise<{ instructions: SystemModelMessage[]; messages: ModelMessage[] }> {
  "use step";
  return buildRunPrompt({
    teamspaceId: input.teamspaceId,
    runId: workflowRunId,
    runtimeKind: "scheduler",
    scheduleId: input.scheduleId,
    accountId: input.accountId,
    modelId: input.modelId,
    maxSteps: input.maxSteps,
  });
}

async function finalizeRun(
  workflowRunId: string,
  usage: { inputTokens?: number; outputTokens?: number; totalTokens?: number },
): Promise<void> {
  "use step";
  await createAgentRunPort(getDb()).finish(workflowRunId, {
    status: "done",
    usage,
  });
}
