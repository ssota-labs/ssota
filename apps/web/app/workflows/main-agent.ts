import { getWorkflowMetadata, getWritable } from "workflow";
import {
  getDb,
  resolveCredentialProvider,
  streamAgent,
  type RunAgentResult,
  type UIMessageChunk,
} from "@ssota/agent-runtime";
import { createAgentRunPort } from "@ssota/adapter-supabase";

export interface RunMainAgentInput {
  projectId: string;
  threadId: string;
  accountId?: string;
  modelId?: string;
  maxSteps?: number;
  chatContext?: Record<string, unknown>;
}

export async function runMainAgentWorkflow(input: RunMainAgentInput) {
  "use workflow";

  const { workflowRunId } = getWorkflowMetadata();
  await claimRunning(input, workflowRunId);
  const result = await runAgentStep(input, workflowRunId);
  await finalizeRun(workflowRunId, result);
  return result;
}

async function claimRunning(
  input: RunMainAgentInput,
  workflowRunId: string,
): Promise<void> {
  "use step";
  const db = getDb();
  await createAgentRunPort(db).start({
    projectId: input.projectId,
    runtimeKind: "main",
    threadId: input.threadId,
    workflowRunId,
    accountId: input.accountId ?? null,
    model: input.modelId ?? null,
  });
}

async function runAgentStep(
  input: RunMainAgentInput,
  workflowRunId: string,
): Promise<RunAgentResult> {
  "use step";
  const credentials = resolveCredentialProvider();
  const writable = getWritable<UIMessageChunk>();
  return streamAgent(
    {
      projectId: input.projectId,
      threadId: input.threadId,
      runId: workflowRunId,
      runtimeKind: "main",
      accountId: input.accountId,
      modelId: input.modelId,
      credentials,
      maxSteps: input.maxSteps,
      chatContext: input.chatContext,
    },
    writable,
  );
}

async function finalizeRun(
  workflowRunId: string,
  result: RunAgentResult,
): Promise<void> {
  "use step";
  const db = getDb();
  await createAgentRunPort(db).finish(workflowRunId, {
    status: result.finalStatus ?? "done",
    usage: result.usage ?? {},
  });
}
