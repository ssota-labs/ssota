import type { ModelMessage, SystemModelMessage, UIMessage } from "ai";
import "@/lib/ai/register-stub-gateway";
import { resolveRunAgent } from "@ssota/agent-runtime";
import {
  claimMainRunning,
  persistMainAssistantMessage,
  finalizeMainRun,
  type RunMainAgentInput,
} from "./main-agent-core";

/** Build the main-agent instructions, messages, and runtime definition in a step. */
export async function buildMainPrompt(
  input: RunMainAgentInput,
  workflowRunId: string,
): Promise<{
  instructions: SystemModelMessage[];
  messages: ModelMessage[];
  definition: Awaited<ReturnType<typeof resolveRunAgent>>["definition"];
  trigger: Awaited<ReturnType<typeof resolveRunAgent>>["trigger"];
}> {
  "use step";
  const resolved = await resolveRunAgent({
    teamspaceId: input.teamspaceId,
    runId: workflowRunId,
    runtimeKind: "main",
    threadId: input.threadId,
    scheduleId: input.scheduleId,
    accountId: input.accountId,
    profileId: input.profileId,
    modelId: input.modelId,
    maxSteps: input.maxSteps,
    agentDefinitionId: input.agentDefinitionId,
    chatContext: input.chatContext,
  });
  return {
    instructions: resolved.instructions,
    messages: resolved.messages,
    definition: resolved.definition,
    trigger: resolved.trigger,
  };
}

/**
 * Durable persistence steps for the WorkflowAgent main agent. Each is a
 * `"use step"` so the run record + assistant message survive crashes and the
 * idempotency guards in main-agent-core protect against workflow replay. They
 * reuse the pure DB helpers from main-agent-core (no WDK imports there).
 */

export async function claimMainWorkflowRun(
  input: RunMainAgentInput,
  runId: string,
): Promise<void> {
  "use step";
  await claimMainRunning(input, runId);
}

/**
 * Flatten the assistant text produced across the agent's steps into chat
 * message parts. Tool-call/-result parts are intentionally dropped — only the
 * user-visible assistant prose is persisted (matching the streamed UI).
 */
function assistantPartsFromMessages(
  messages: ModelMessage[],
  inputCount: number,
): UIMessage["parts"] {
  const parts: UIMessage["parts"] = [];
  for (const message of messages.slice(inputCount)) {
    if (message.role !== "assistant") continue;
    const content = message.content;
    if (typeof content === "string") {
      if (content.trim()) parts.push({ type: "text", text: content });
      continue;
    }
    for (const c of content) {
      if (c.type === "text" && c.text.trim()) {
        parts.push({ type: "text", text: c.text });
      }
    }
  }
  return parts;
}

export async function persistMainWorkflowAssistant(
  input: RunMainAgentInput,
  messages: ModelMessage[],
  inputCount: number,
): Promise<void> {
  "use step";
  const parts = assistantPartsFromMessages(messages, inputCount);
  await persistMainAssistantMessage(input, parts.length > 0 ? parts : null);
}

export async function finalizeMainWorkflowRun(
  runId: string,
  usage: { inputTokens?: number; outputTokens?: number; totalTokens?: number },
): Promise<void> {
  "use step";
  await finalizeMainRun(runId, {
    finishReason: "stop",
    text: "",
    finalStatus: "done",
    usage,
  });
}
