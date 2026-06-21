import type { ModelMessage } from "ai";
import { serializeTask, readWorkflowByKey } from "@ssota/core";
import { RESERVED_MAIN_WORKFLOW_KEY } from "@ssota/contracts/workflows";
import { getTaskPort, getWorkflowPort } from "./ports.js";
import { createSsotaTools } from "./tools/index.js";
import { createSandboxTools } from "./tools/sandbox.js";
import { createExternalTools } from "./tools/external.js";
import {
  buildSystemPrompt,
  FALLBACK_INSTRUCTIONS,
  type ResolvedWorkflowInstructions,
} from "./system-prompt.js";
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
  const tools = {
    ...createSsotaTools(),
    ...(input.sandbox ? createSandboxTools() : {}),
    ...(input.credentials ? createExternalTools() : {}),
  };
  const context: AgentRunContext = { projectId, taskId, runId, accountId };

  // Resolve workflow instructions from the per-project `workflows` table
  // (DB-persisted, tenant-editable), falling back to the embedded registry on
  // any read failure so runs never break on an un-seeded/old project.
  let resolved: ResolvedWorkflowInstructions | undefined;
  try {
    const workflows = getWorkflowPort(projectId, accountId);
    const [main, wf] = await Promise.all([
      readWorkflowByKey(workflows, RESERVED_MAIN_WORKFLOW_KEY),
      readWorkflowByKey(workflows, task.workflowKey),
    ]);
    if (main || wf) {
      resolved = {
        base: main?.definition.instruction ?? FALLBACK_INSTRUCTIONS,
        workflowInstruction: wf?.definition.instruction ?? null,
      };
    }
  } catch {
    resolved = undefined; // buildSystemPrompt falls back to the embedded registry
  }

  const instructions = buildSystemPrompt({ task, projectId, accountId, resolved });
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
    credentials: input.credentials,
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
