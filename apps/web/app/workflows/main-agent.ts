import { getWorkflowMetadata, getWritable } from "workflow";
import type { UIMessage } from "ai";
import {
  getDb,
  resolveCredentialProvider,
  streamAgent,
  type RunAgentResult,
  type UIMessageChunk,
} from "@ssota/agent-runtime";
import { createAgentRunPort, createChatPort } from "@ssota/adapter-postgres";
import { collectAssistantMessageParts } from "@/lib/chat/persist-assistant-message";

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
  const { result, parts } = await runAgentStep(input, workflowRunId);
  await persistAssistantMessage(input, parts);
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

async function pipeReadableToWritable(
  readable: ReadableStream<UIMessageChunk>,
  writable: WritableStream<UIMessageChunk>,
): Promise<void> {
  const reader = readable.getReader();
  const writer = writable.getWriter();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      await writer.write(value);
    }
  } finally {
    await writer.close();
  }
}

async function runAgentStep(
  input: RunMainAgentInput,
  workflowRunId: string,
): Promise<{ result: RunAgentResult; parts: UIMessage["parts"] | null }> {
  "use step";
  const credentials = resolveCredentialProvider();
  const { readable, writable } = new TransformStream<UIMessageChunk>();
  const workflowWritable = getWritable<UIMessageChunk>();
  const [toClient, toPersist] = readable.tee();

  const forwardPromise = pipeReadableToWritable(toClient, workflowWritable);
  const collectPromise = collectAssistantMessageParts(toPersist);

  const result = await streamAgent(
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

  await forwardPromise;
  const parts = await collectPromise;

  return { result, parts };
}

/**
 * Persist the assistant turn inside the durable workflow so it survives client
 * disconnect. Skips when the thread is unknown (platform bots) or already has
 * a trailing assistant message (workflow replay).
 */
async function persistAssistantMessage(
  input: RunMainAgentInput,
  parts: UIMessage["parts"] | null,
): Promise<void> {
  "use step";
  if (!parts || parts.length === 0 || !input.threadId) return;

  const db = getDb();
  const chat = createChatPort(db, {
    projectId: input.projectId,
    accountId: input.accountId ?? null,
  });

  const thread = await chat.getThread(input.threadId);
  if (!thread) return;

  const messages = await chat.listMessages(input.threadId);
  const last = messages.at(-1);
  if (last?.role === "assistant") return;

  await chat.appendMessage({
    threadId: input.threadId,
    role: "assistant",
    parts,
  });
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
