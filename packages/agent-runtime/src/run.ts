import type { ModelMessage } from "ai";
import { serializeTask } from "@ssota/core";
import { getTaskPort } from "./ports.js";
import { createSsotaTools } from "./tools/index.js";
import { createSandboxTools } from "./tools/sandbox.js";
import { buildSystemPrompt } from "./system-prompt.js";
import { DEFAULT_MODEL_ID } from "./models.js";
import { createAiSdkLoopEngine } from "./engine/ai-sdk.js";
import type { AgentRunContext, LoopEngine } from "./engine/types.js";
import type { SandboxSession } from "./sandbox/session.js";

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
 * Run the SSOTA agent against a single task to completion. The agent reads/
 * writes the graph and tasks via tools and decides the terminal status itself
 * (`complete_task` / `block_task`). Intended to be called from inside a
 * Vercel Workflow `"use step"` so the whole run is durable.
 */
export async function runAgentForTask(
  input: RunAgentForTaskInput,
): Promise<RunAgentForTaskResult> {
  const { projectId, taskId, runId, accountId } = input;

  const taskPort = getTaskPort(projectId);
  const domainTask = await taskPort.getTask(taskId);
  if (!domainTask) {
    throw new Error(`Task ${taskId} not found in project ${projectId}`);
  }
  const task = serializeTask(domainTask);

  const engine = input.engine ?? createAiSdkLoopEngine();
  const tools = input.sandbox
    ? { ...createSsotaTools(), ...createSandboxTools() }
    : createSsotaTools();
  const context: AgentRunContext = { projectId, taskId, runId, accountId };

  const instructions = buildSystemPrompt({ task, projectId, accountId });
  const messages: ModelMessage[] = [
    {
      role: "user",
      content: `Work the task "${task.title}" (id ${task.id}) to completion, then call complete_task or block_task.`,
    },
  ];

  const result = await engine.run({
    instructions,
    messages,
    tools,
    modelId: input.modelId ?? DEFAULT_MODEL_ID,
    context,
    sandbox: input.sandbox,
    maxSteps: input.maxSteps,
  });

  const finalTask = await taskPort.getTask(taskId);

  return {
    finishReason: result.finishReason,
    text: result.text,
    finalStatus: finalTask?.status ?? null,
    usage: result.usage,
  };
}
