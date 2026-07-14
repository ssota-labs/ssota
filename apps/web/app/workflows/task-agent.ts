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
import { persistRunTranscriptStep } from "./run-transcript-steps";
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
    await persistRunTranscriptStep(workflowRunId, result.messages, messages.length);
    await finalizeTaskRun(input, workflowRunId, sumStepUsage(result.steps));
    return {
      messageCount: result.messages.length,
      stepCount: result.steps.length,
    };
  } catch (error) {
    // 에이전트 루프가 던져도 task/run이 running으로 남지 않게 failed로 finalize.
    // dispatch가 남긴 incremental 툴 이벤트가 크래시 런의 로그가 된다.
    await finalizeTaskRun(input, workflowRunId, {});
    throw error;
  } finally {
    if (sandboxSessionId) {
      await stopSandboxStep(sandboxSessionId, input.teamspaceId);
    }
  }
}
