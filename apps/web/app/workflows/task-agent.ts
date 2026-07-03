import { getWorkflowMetadata } from "workflow";
import { buildMainWorkflowAgent } from "@ssota/agent-runtime/workflow";
import { dispatchMainTool } from "./main-workflow-agent-dispatch";
import {
  claimTaskRun,
  buildTaskPromptStep,
  provisionSandboxStep,
  stopSandboxStep,
  finalizeTaskRun,
  sumStepUsage,
  type RunTaskAgentInput,
} from "./task-agent-steps";
import { resolveTeamspaceOrgScopeStep } from "./teamspace-org-scope-step";

export type { RunTaskAgentInput };

/**
 * WorkflowAgent-backed task agent (dispatch/cron entry). Durable shape: claim
 * (+ mark running) → provision sandbox (dev-capable) → build prompt → agent
 * loop (per-tool durable steps; sandbox tools re-attach by id) → finalize +
 * stop sandbox. Background run — no client stream consumer.
 */
export async function runTaskAgentWorkflow(input: RunTaskAgentInput) {
  "use workflow";

  const { workflowRunId } = getWorkflowMetadata();
  await claimTaskRun(input, workflowRunId);

  const { sandboxSessionId, sandboxAccess } = await provisionSandboxStep(
    input,
    workflowRunId,
  );

  const { instructions, messages, definition, trigger } = await buildTaskPromptStep(
    input,
    workflowRunId,
  );

  const organizationId = await resolveTeamspaceOrgScopeStep(input.teamspaceId);

  const agent = buildMainWorkflowAgent({
    ssota: {
      teamspaceId: input.teamspaceId,
      organizationId,
      taskId: input.taskId,
      runId: workflowRunId,
      accountId: input.accountId,
      sandboxSessionId,
      sandboxAccess,
      agentDefinitionId: definition.agentDefinitionId,
      nodeScopes: definition.nodeScopes,
      enabledConnectorProviders: definition.enabledConnectorProviders,
      trigger,
    },
    definition,
    dispatch: dispatchMainTool,
    includeSandboxTools: Boolean(sandboxSessionId),
    sandboxAccess,
    instructions,
    modelId: input.modelId,
    maxSteps: input.maxSteps,
  });

  try {
    const result = await agent.stream({ messages });
    await finalizeTaskRun(input, workflowRunId, sumStepUsage(result.steps));
    return {
      messageCount: result.messages.length,
      stepCount: result.steps.length,
    };
  } finally {
    if (sandboxSessionId) {
      await stopSandboxStep(sandboxSessionId, input.teamspaceId);
    }
  }
}
