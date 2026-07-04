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
} from "./task-agent-steps";
import type { RunSsotaAgentInput } from "./ssota-agent-core";
import { resolveTeamspaceOrgScopeStep } from "./teamspace-org-scope-step";

/**
 * Durable task agent run reached via the agent run/gate routes and the chat
 * bot (the JOB_RUNNER=workflow path, kept under this name + RunSsotaAgentInput
 * so those callers are unchanged). Identical to runTaskAgentWorkflow — both
 * share the runtimeKind="task" steps in task-agent-steps.
 */
export type { RunSsotaAgentInput };

export async function runSsotaAgentWorkflow(input: RunSsotaAgentInput) {
  "use workflow";

  const { workflowRunId } = getWorkflowMetadata();
  await claimTaskRun(input, workflowRunId);

  const { sandboxSessionId, sandboxAccess } = await provisionSandboxStep(
    input,
    workflowRunId,
  );

  const { instructions, messages, definition, trigger, approvedConnectorToolSlugs } =
    await buildTaskPromptStep(
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
      connectorBindings: definition.connectorBindings,
      approvedConnectorToolSlugs,
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
