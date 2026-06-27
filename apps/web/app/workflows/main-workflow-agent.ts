import { getWorkflowMetadata, getWritable } from "workflow";
import {
  buildMainWorkflowAgent,
  type ModelCallStreamPart,
} from "@ssota/agent-runtime/workflow";
import {
  dispatchMainTool,
  fetchMainConnectorToolDefs,
} from "./main-workflow-agent-dispatch";
import {
  buildMainPrompt,
  claimMainWorkflowRun,
  persistMainWorkflowAssistant,
  finalizeMainWorkflowRun,
} from "./main-workflow-agent-steps";
import type { RunMainAgentInput } from "./main-agent-core";

export type { RunMainAgentInput };

/**
 * WorkflowAgent-backed main (chat) agent run. Durable shape: claim → build
 * prompt (chat history) → stream (agent loop + per-tool steps) → persist →
 * finalize. Output streams as ModelCallStreamPart to the run's default stream;
 * the route transforms it to a UI message stream. Workflow-safe imports only,
 * plus `"use step"` boundaries.
 */
export async function runMainWorkflowAgent(input: RunMainAgentInput) {
  "use workflow";

  const { workflowRunId } = getWorkflowMetadata();
  await claimMainWorkflowRun(input, workflowRunId);

  const { instructions, messages } = await buildMainPrompt(input, workflowRunId);

  // Serializable per-run scope; `profileId` is the connector acting entity
  // (Composio signed-in user) and is threaded into every tool's context.
  const ssota = {
    projectId: input.projectId,
    runId: workflowRunId,
    accountId: input.accountId,
    profileId: input.profileId,
  };

  // Connector tools (Composio meta-tools / legacy facade) are resolved at run
  // time from the active adapter and declared dynamically on the agent.
  const connectorToolDefs = await fetchMainConnectorToolDefs(ssota);

  const agent = buildMainWorkflowAgent({
    ssota,
    dispatch: dispatchMainTool,
    connectorToolDefs,
    instructions,
    modelId: input.modelId,
    maxSteps: input.maxSteps,
  });

  const result = await agent.stream({
    messages,
    writable: getWritable<ModelCallStreamPart>(),
  });

  await persistMainWorkflowAssistant(input, result.messages, messages.length);

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
