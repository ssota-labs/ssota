import { getWorkflowMetadata } from "workflow";
import { buildMainWorkflowAgent } from "@ssota/agent-runtime/workflow";
import { dispatchMainTool } from "./main-workflow-agent-dispatch";
import {
  claimTaskRun,
  buildTaskPromptStep,
  finalizeTaskRun,
  sumStepUsage,
} from "./task-agent-steps";
import type { RunSsotaAgentInput } from "./ssota-agent-core";

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

  await finalizeTaskRun(input, workflowRunId, sumStepUsage(result.steps));

  return result;
}
