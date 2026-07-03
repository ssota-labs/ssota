import type { UIMessage } from "ai";
import { getDb, type RunAgentResult } from "@ssota/agent-runtime";
import {
  createAgentDefinitionPort,
  createAgentRunPort,
  createChatPort,
} from "@ssota/adapter-postgres";

/**
 * Pure DB helpers for the main (chat) agent run lifecycle, wrapped in
 * `"use step"` boundaries by the WorkflowAgent runner
 * (main-workflow-agent-steps.ts). No Vercel Workflow DevKit imports here.
 */

export interface RunMainAgentInput {
  teamspaceId: string;
  threadId: string;
  accountId?: string;
  scheduleId?: string;
  /** Run a specialist agent definition instead of the teamspace main agent. */
  agentDefinitionId?: string;
  /** Signed-in user (Composio acting entity for connector tools). */
  profileId?: string;
  modelId?: string;
  maxSteps?: number;
  chatContext?: Record<string, unknown>;
}

const CHAT_THREAD_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Platform bot threads (Slack/Discord ids) are not chat_threads UUIDs. */
function chatThreadIdForTelemetry(threadId?: string): string | null {
  if (!threadId) return null;
  return CHAT_THREAD_UUID_RE.test(threadId) ? threadId : null;
}

/** Main agent runs from code; only specialist runs reference a DB row. */
async function agentDefinitionIdForTelemetry(
  teamspaceId: string,
  agentDefinitionId?: string,
): Promise<string | null> {
  if (!agentDefinitionId) return null;
  const port = createAgentDefinitionPort(getDb(), { teamspaceId });
  const definition = await port.getById(agentDefinitionId);
  return definition ? agentDefinitionId : null;
}

export async function claimMainRunning(
  input: RunMainAgentInput,
  runId: string,
): Promise<void> {
  const db = getDb();
  const agentDefinitionId = await agentDefinitionIdForTelemetry(
    input.teamspaceId,
    input.agentDefinitionId,
  );
  await createAgentRunPort(db).start({
    teamspaceId: input.teamspaceId,
    runtimeKind: "main",
    threadId: chatThreadIdForTelemetry(input.threadId),
    scheduleId: input.scheduleId ?? null,
    workflowRunId: runId,
    accountId: input.accountId ?? null,
    agentDefinitionId,
    trigger:
      input.chatContext?.trigger === "heartbeat"
        ? "heartbeat"
        : input.chatContext?.trigger === "chatbot"
          ? "chatbot"
          : input.scheduleId
            ? "schedule"
            : "chat",
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
  if (!CHAT_THREAD_UUID_RE.test(input.threadId)) return;

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
