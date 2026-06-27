import type { UIMessage } from "ai";
import { getDb, type RunAgentResult } from "@ssota/agent-runtime";
import { createAgentRunPort, createChatPort } from "@ssota/adapter-postgres";

/**
 * Pure DB helpers for the main (chat) agent run lifecycle, wrapped in
 * `"use step"` boundaries by the WorkflowAgent runner
 * (main-workflow-agent-steps.ts). No Vercel Workflow DevKit imports here.
 */

export interface RunMainAgentInput {
  projectId: string;
  threadId: string;
  accountId?: string;
  modelId?: string;
  maxSteps?: number;
  chatContext?: Record<string, unknown>;
}

export async function claimMainRunning(
  input: RunMainAgentInput,
  runId: string,
): Promise<void> {
  const db = getDb();
  await createAgentRunPort(db).start({
    projectId: input.projectId,
    runtimeKind: "main",
    threadId: input.threadId,
    workflowRunId: runId,
    accountId: input.accountId ?? null,
    model: input.modelId ?? null,
  });
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
