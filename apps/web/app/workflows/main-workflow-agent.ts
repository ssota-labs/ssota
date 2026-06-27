import { getWorkflowMetadata, getWritable } from "workflow";
import type { ModelMessage } from "ai";
import {
  buildMainWorkflowAgent,
  type ModelCallStreamPart,
} from "@ssota/agent-runtime/workflow";
import { dispatchMainTool } from "./main-workflow-agent-dispatch";
import {
  claimMainWorkflowRun,
  persistMainWorkflowAssistant,
  finalizeMainWorkflowRun,
} from "./main-workflow-agent-steps";
import type { RunMainAgentInput } from "./main-agent-core";

export interface RunMainWorkflowAgentInput extends RunMainAgentInput {
  /** Conversation history in AI SDK ModelMessage format. */
  messages: ModelMessage[];
  /** Optional system instructions override. */
  instructions?: string;
}

/**
 * WorkflowAgent-backed main (chat) agent run. Durable shape mirrors the legacy
 * runner: claim → stream (agent loop + per-tool steps) → persist → finalize.
 * Output streams as ModelCallStreamPart to the run's default stream; the route
 * transforms it to a UI message stream. This module imports only workflow-safe
 * code plus `"use step"` boundaries.
 */
export async function runMainWorkflowAgent(input: RunMainWorkflowAgentInput) {
  "use workflow";

  const { workflowRunId } = getWorkflowMetadata();
  await claimMainWorkflowRun(input, workflowRunId);

  const agent = buildMainWorkflowAgent({
    ssota: {
      projectId: input.projectId,
      runId: workflowRunId,
      accountId: input.accountId,
    },
    dispatch: dispatchMainTool,
    instructions: input.instructions,
    modelId: input.modelId,
    maxSteps: input.maxSteps,
  });

  const result = await agent.stream({
    messages: input.messages,
    writable: getWritable<ModelCallStreamPart>(),
  });

  await persistMainWorkflowAssistant(input, result.messages, input.messages.length);

  const usage = result.steps.reduce(
    (acc, step) => ({
      inputTokens: (acc.inputTokens ?? 0) + (step.usage?.inputTokens ?? 0),
      outputTokens: (acc.outputTokens ?? 0) + (step.usage?.outputTokens ?? 0),
      totalTokens: (acc.totalTokens ?? 0) + (step.usage?.totalTokens ?? 0),
    }),
    { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
  );
  await finalizeMainWorkflowRun(workflowRunId, usage);

  return { messageCount: result.messages.length, stepCount: result.steps.length };
}
