import type { UIMessage } from "ai";
import {
  getDb,
  streamAgent,
  type RunAgentResult,
  type UIMessageChunk,
} from "@ssota/agent-runtime";
import { createAgentRunPort, createChatPort } from "@ssota/adapter-postgres";
import { collectAssistantMessageParts } from "@/lib/chat/persist-assistant-message";

/**
 * Pure main (chat) agent logic shared by every {@link MainAgentRunner}. Contains
 * no Vercel Workflow DevKit imports — the durable EE runner wraps these in
 * `"use step"` boundaries while the OSS inline runner calls
 * {@link runMainAgentCore} directly.
 */

export interface RunMainAgentInput {
  teamspaceId: string;
  threadId: string;
  accountId?: string;
  /** Signed-in user (Supabase auth id) — entity for Composio connector tools. */
  profileId?: string;
  modelId?: string;
  maxSteps?: number;
  chatContext?: Record<string, unknown>;
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
    try {
      await writer.close();
    } catch {
      // Client may have already closed/cancelled the stream.
    }
  }
}

export async function claimMainRunning(
  input: RunMainAgentInput,
  runId: string,
): Promise<void> {
  const db = getDb();
  await createAgentRunPort(db).start({
    teamspaceId: input.teamspaceId,
    runtimeKind: "main",
    threadId: input.threadId,
    workflowRunId: runId,
    accountId: input.accountId ?? null,
    model: input.modelId ?? null,
  });
}

export async function runMainAgentStepCore(
  input: RunMainAgentInput,
  runId: string,
  clientWritable: WritableStream<UIMessageChunk>,
): Promise<{ result: RunAgentResult; parts: UIMessage["parts"] | null }> {
  const { readable, writable } = new TransformStream<UIMessageChunk>();
  const [toClient, toPersist] = readable.tee();

  const forwardPromise = pipeReadableToWritable(toClient, clientWritable);
  const collectPromise = collectAssistantMessageParts(toPersist);

  const result = await streamAgent(
    {
      teamspaceId: input.teamspaceId,
      threadId: input.threadId,
      runId,
      runtimeKind: "main",
      accountId: input.accountId,
      profileId: input.profileId,
      modelId: input.modelId,
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
 * Persist the assistant turn inside the run so it survives client disconnect.
 * Skips when the thread is unknown (platform bots) or already has a trailing
 * assistant message (workflow replay).
 */
export async function persistMainAssistantMessage(
  input: RunMainAgentInput,
  parts: UIMessage["parts"] | null,
): Promise<void> {
  if (!parts || parts.length === 0 || !input.threadId) return;

  const db = getDb();
  const chat = createChatPort(db, {
    teamspaceId: input.teamspaceId,
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

export async function finalizeMainRun(
  runId: string,
  result: RunAgentResult,
): Promise<void> {
  const db = getDb();
  await createAgentRunPort(db).finish(runId, {
    status: result.finalStatus ?? "done",
    usage: result.usage ?? {},
  });
}

/**
 * Inline (non-durable) sequence: claim → run → persist → finalize. The caller
 * owns `clientWritable` and must close it once this resolves so the readable
 * side terminates.
 */
export async function runMainAgentCore(
  input: RunMainAgentInput,
  runId: string,
  clientWritable: WritableStream<UIMessageChunk>,
): Promise<RunAgentResult> {
  await claimMainRunning(input, runId);
  const { result, parts } = await runMainAgentStepCore(
    input,
    runId,
    clientWritable,
  );
  await persistMainAssistantMessage(input, parts);
  await finalizeMainRun(runId, result);
  return result;
}
