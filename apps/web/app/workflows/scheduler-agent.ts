import { getWorkflowMetadata } from "workflow";
import { getDb, runAgent } from "@ssota/agent-runtime";
import { createAgentRunPort } from "@ssota/adapter-postgres";

export interface RunSchedulerAgentInput {
  teamspaceId: string;
  scheduleId: string;
  accountId?: string;
  modelId?: string;
  maxSteps?: number;
}

export async function runSchedulerAgentWorkflow(input: RunSchedulerAgentInput) {
  "use workflow";

  const { workflowRunId } = getWorkflowMetadata();
  await claimRunning(input, workflowRunId);
  const result = await runAgentStep(input, workflowRunId);
  await finalizeRun(workflowRunId, result);
  return result;
}

async function claimRunning(
  input: RunSchedulerAgentInput,
  workflowRunId: string,
): Promise<void> {
  "use step";
  const db = getDb();
  await createAgentRunPort(db).start({
    teamspaceId: input.teamspaceId,
    runtimeKind: "scheduler",
    scheduleId: input.scheduleId,
    workflowRunId,
    accountId: input.accountId ?? null,
    model: input.modelId ?? null,
  });
}

async function runAgentStep(
  input: RunSchedulerAgentInput,
  workflowRunId: string,
) {
  "use step";
  return runAgent({
    teamspaceId: input.teamspaceId,
    scheduleId: input.scheduleId,
    runId: workflowRunId,
    runtimeKind: "scheduler",
    accountId: input.accountId,
    modelId: input.modelId,
    maxSteps: input.maxSteps,
  });
}

async function finalizeRun(workflowRunId: string, result: { usage?: Record<string, unknown> }) {
  "use step";
  const db = getDb();
  await createAgentRunPort(db).finish(workflowRunId, {
    status: "done",
    usage: result.usage ?? {},
  });
}
