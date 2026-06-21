import type { ModelMessage } from "ai";
import { serializeTask } from "@ssota/core";
import { getTaskPort } from "./ports.js";
import { createSsotaTools } from "./tools/index.js";
import { createSandboxTools } from "./tools/sandbox.js";
import { createExternalTools } from "./tools/external.js";
import { buildSystemPrompt } from "./system-prompt.js";
import { DEFAULT_MODEL_ID } from "./models.js";
import { createAiSdkLoopEngine } from "./engine/ai-sdk.js";
import type { AgentRunContext, LoopEngine } from "./engine/types.js";
import type { SandboxSession } from "./sandbox/session.js";
import type { CredentialProvider } from "./credentials/provider.js";

export interface RunAgentForTaskInput {
  projectId: string;
  taskId: string;
  /** Durable workflow run id (correlates with agent_runs). */
  runId: string;
  /** End-user data partition (Phase 5). Undefined in Phase 1. */
  accountId?: string;
  modelId?: string;
  /** Override the loop engine (defaults to the AI SDK engine). */
  engine?: LoopEngine;
  /** Dev-capable runs pass a sandbox; sandbox tools are then attached. */
  sandbox?: SandboxSession;
  /** Credential provider (Vercel Connect); enables external-service tools. */
  credentials?: CredentialProvider;
  maxSteps?: number;
}

export interface RunAgentForTaskResult {
  finishReason: string;
  text: string;
  /** Task status after the run — the agent decides this via tools. */
  finalStatus: string | null;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
}

/**
 * Pull a replayable conversation out of `task.context.chat.messages` (written by
 * the in-app web chat). Returns null when absent/empty so callers fall back to
 * the default single synthetic instruction.
 */
function extractChatMessages(
  context: Record<string, unknown> | undefined,
): ModelMessage[] | null {
  const chat = context?.chat as { messages?: unknown } | undefined;
  const messages = chat?.messages;
  if (!Array.isArray(messages) || messages.length === 0) return null;
  return messages as ModelMessage[];
}

async function prepareRun(input: RunAgentForTaskInput) {
  const { projectId, taskId, runId, accountId } = input;
  const taskPort = getTaskPort(projectId, accountId);
  const domainTask = await taskPort.getTask(taskId);
  if (!domainTask) {
    throw new Error(`Task ${taskId} not found in project ${projectId}`);
  }
  const task = serializeTask(domainTask);

  const engine = input.engine ?? createAiSdkLoopEngine();
  const tools = {
    ...createSsotaTools(),
    ...(input.sandbox ? createSandboxTools() : {}),
    ...(input.credentials ? createExternalTools() : {}),
  };

  // Multi-turn chat: when the task carries a conversation (in-app web chat seeds
  // `context.chat.messages` with prior turns + the new user message), replay it
  // so the agent has memory. Headless/Slack tasks omit it and get the default
  // single synthetic instruction.
  const chatMessages = extractChatMessages(task.context);
  const messages: ModelMessage[] = chatMessages ?? [
    {
      role: "user" as const,
      content: `Work the task "${task.title}" (id ${task.id}) to completion, then call complete_task or block_task.`,
    },
  ];

  const runInput = {
    instructions: buildSystemPrompt({ task, projectId, accountId }),
    messages,
    tools,
    modelId: input.modelId ?? DEFAULT_MODEL_ID,
    context: { projectId, taskId, runId, accountId } satisfies AgentRunContext,
    sandbox: input.sandbox,
    credentials: input.credentials,
    maxSteps: input.maxSteps,
  };
  return { taskPort, engine, runInput };
}

function buildResult(
  result: { finishReason: string; text: string; usage?: RunAgentForTaskResult["usage"] },
  finalStatus: string | null,
): RunAgentForTaskResult {
  return {
    finishReason: result.finishReason,
    text: result.text,
    finalStatus,
    usage: result.usage,
  };
}

/**
 * Run the SSOTA agent against a single task to completion. The agent reads/
 * writes the graph and tasks via tools and decides the terminal status itself
 * (`complete_task` / `block_task`). Intended to be called from inside a
 * Vercel Workflow `"use step"` so the whole run is durable.
 */
export async function runAgentForTask(
  input: RunAgentForTaskInput,
): Promise<RunAgentForTaskResult> {
  const { taskPort, engine, runInput } = await prepareRun(input);
  const result = await engine.run(runInput);
  const finalTask = await taskPort.getTask(input.taskId);
  return buildResult(result, finalTask?.status ?? null);
}

/**
 * Like {@link runAgentForTask} but streams UI message chunks to `writable`
 * (chat delivery). The engine must support streaming.
 */
export async function streamAgentForTask(
  input: RunAgentForTaskInput,
  writable: WritableStream,
): Promise<RunAgentForTaskResult> {
  const { taskPort, engine, runInput } = await prepareRun(input);
  if (!engine.stream) {
    throw new Error("The configured engine does not support streaming");
  }
  const result = await engine.stream(runInput, writable);
  const finalTask = await taskPort.getTask(input.taskId);
  return buildResult(result, finalTask?.status ?? null);
}
