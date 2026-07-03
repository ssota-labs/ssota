import { getWorkflowMetadata, getWritable } from "workflow";
import "@/lib/ai/register-stub-gateway";
import {
  buildMainWorkflowAgent,
  type ModelCallStreamPart,
} from "@ssota/agent-runtime/workflow";
import { dispatchMainTool } from "./main-workflow-agent-dispatch";
import {
  buildMainPrompt,
  claimMainWorkflowRun,
  persistMainWorkflowAssistant,
  finalizeMainWorkflowRun,
} from "./main-workflow-agent-steps";
import type { RunMainAgentInput } from "./main-agent-core";
import { resolveTeamspaceOrgScopeStep } from "./teamspace-org-scope-step";

export type { RunMainAgentInput };

export async function runMainWorkflowAgent(input: RunMainAgentInput) {
  "use workflow";

  const { workflowRunId } = getWorkflowMetadata();
  await claimMainWorkflowRun(input, workflowRunId);

  const { instructions, messages, definition, trigger } = await buildMainPrompt(
    input,
    workflowRunId,
  );

  const organizationId = await resolveTeamspaceOrgScopeStep(input.teamspaceId);

  const ssota = {
    teamspaceId: input.teamspaceId,
    organizationId,
    runId: workflowRunId,
    accountId: input.accountId,
    profileId: input.profileId,
    agentDefinitionId: definition.agentDefinitionId,
    nodeScopes: definition.nodeScopes,
    enabledConnectorProviders: definition.enabledConnectorProviders,
    trigger,
  };

  const agent = buildMainWorkflowAgent({
    ssota,
    definition,
    dispatch: dispatchMainTool,
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
