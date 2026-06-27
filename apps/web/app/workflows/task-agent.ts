import { getWorkflowMetadata } from "workflow";
import { buildMainWorkflowAgent } from "@ssota/agent-runtime/workflow";
import { dispatchMainTool } from "./main-workflow-agent-dispatch";
import {
  claimTaskRun,
  buildTaskPromptStep,
  finalizeTaskRun,
  sumStepUsage,
  type RunTaskAgentInput,
} from "./task-agent-steps";

export type { RunTaskAgentInput };

/**
 * WorkflowAgent-backed task agent (dispatch/cron entry). Durable shape: claim
 * (+ mark running) → build prompt → agent loop (per-tool durable steps) →
 * finalize (resolve task status). Background run — no client stream consumer.
 *
 * NOTE: sandbox (dev-capable) tools are wired via the dispatcher's sandbox
 * re-attach branch; see main-workflow-agent-dispatch.
 */
export async function runTaskAgentWorkflow(input: RunTaskAgentInput) {
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

  return { messageCount: result.messages.length, stepCount: result.steps.length };
}
