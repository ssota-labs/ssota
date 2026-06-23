import { getWorkflowMetadata, getWritable } from "workflow";
import {
  getDb,
  resolveCredentialProvider,
  streamAgent,
  type RunAgentResult,
  type UIMessageChunk,
} from "@ssota/agent-runtime";
import { createAgentRunPort } from "@ssota/adapter-postgres";
import { dispatchReadyTasks } from "@/lib/agent/dispatch";

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
  await dispatchSpawnedTasks(input);
  return result;
}

/**
 * Close the loop: after the chat turn, start task-agent runs for any ready
 * Agent tasks the agent spawned this turn — so spawning in chat executes
 * without a separate dispatch trigger. Runs as a workflow step (durable, unlike
 * a request `after()`); concurrency-capped; disable with CHAT_AUTODISPATCH=0.
 */
async function dispatchSpawnedTasks(input: RunMainAgentInput): Promise<void> {
  "use step";
  if (process.env.CHAT_AUTODISPATCH === "0") return;
  try {
    const result = await dispatchReadyTasks({
      projectId: input.projectId,
      accountId: input.accountId,
    });
    if (result.dispatched.length > 0) {
      console.log(
        `[main-agent] auto-dispatched ${result.dispatched.length} task run(s)`,
      );
    }
  } catch (error) {
    console.error("[main-agent] auto-dispatch failed", error);
  }
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
