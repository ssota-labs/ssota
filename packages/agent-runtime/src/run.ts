import type { ModelMessage, SystemModelMessage } from "ai";
import { ExecutionDirectiveSchema } from "@ssota/contracts";
import { listBuiltinWorkflowIndex } from "@ssota/contracts/workflows";
import {
  serializeTask,
  readWorkflowInstructionById,
} from "@ssota/core";
import {
  getTaskPort,
  getWorkflowInstructionPort,
} from "./ports.js";
import { createSsotaTools } from "./tools/index.js";
import { createSandboxTools } from "./tools/sandbox.js";
import { getConnectorAdapter } from "./connectors/adapter.js";
import { buildRunInstructionMessages } from "./runtime-prompt.js";
import { DEFAULT_MODEL_ID } from "./models.js";
import { createAiSdkLoopEngine } from "./engine/ai-sdk.js";
import type { AgentRunContext, LoopEngine } from "./engine/types.js";
import type { SandboxSession } from "./sandbox/session.js";
import type { CredentialProvider } from "./credentials/provider.js";
import type { AgentRuntimeKind } from "@ssota/contracts";

export interface RunAgentInput {
  projectId: string;
  runId: string;
  runtimeKind: AgentRuntimeKind;
  taskId?: string;
  threadId?: string;
  scheduleId?: string;
  accountId?: string;
  /**
   * Signed-in user (Supabase `auth.users.id`) driving this run. With the org it
   * forms the Composio entity for connector tools. Absent on scheduler /
   * autonomous runs → Composio connectors are not attached.
   */
  profileId?: string;
  modelId?: string;
  engine?: LoopEngine;
  sandbox?: SandboxSession;
  /** @deprecated Connector credentials are resolved by the connector adapter. */
  credentials?: CredentialProvider;
  maxSteps?: number;
  /** Main-runtime chat transcript injected from the web chat route. */
  chatContext?: Record<string, unknown>;
}

export interface RunAgentForTaskInput extends RunAgentInput {
  runtimeKind: "task";
  taskId: string;
}

export interface RunAgentResult {
  finishReason: string;
  text: string;
  finalStatus: string | null;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
}

function extractChatMessages(
  context: Record<string, unknown> | undefined,
): ModelMessage[] | null {
  const chat = context?.chat as { messages?: unknown } | undefined;
  const messages = chat?.messages;
  if (!Array.isArray(messages) || messages.length === 0) return null;
  return messages as ModelMessage[];
}

function extractExecutionDirective(
  context: Record<string, unknown> | undefined,
) {
  const raw = context?.executionDirective;
  if (!raw) return null;
  const parsed = ExecutionDirectiveSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

async function prepareRun(input: RunAgentInput) {
  const { projectId, runId, accountId, runtimeKind } = input;
  const instructionPort = getWorkflowInstructionPort(projectId, accountId);

  // Resolve the connector adapter up front so its kind can drive the prompt's
  // connections guidance (Composio vs legacy tool names).
  const adapter = getConnectorAdapter();
  const connectorKind = adapter?.kind;

  let instructions: SystemModelMessage[] = [];
  let messages: ModelMessage[] = [];
  const taskPort = getTaskPort(projectId, accountId);

  if (runtimeKind === "main") {
    const dbInstructions = await instructionPort.listInstructions();
    const dbKeys = new Set(dbInstructions.map((w) => w.key));
    // DB rows override built-ins with the same key.
    const builtins = listBuiltinWorkflowIndex().filter((b) => !dbKeys.has(b.key));
    const workflowManifest = [
      ...dbInstructions.map((w) => ({
        key: w.key,
        name: w.name,
        description: w.description,
      })),
      ...builtins,
    ];
    instructions = buildRunInstructionMessages({
      runtimeKind: "main",
      projectId,
      accountId,
      connectorKind,
      workflowManifest,
    });
    const chatMessages = extractChatMessages(input.chatContext);
    messages = chatMessages ?? [
      {
        role: "user" as const,
        content: "Continue the conversation and help the user.",
      },
    ];
  } else if (runtimeKind === "task" && input.taskId) {
    const domainTask = await taskPort.getTask(input.taskId);
    if (!domainTask) {
      throw new Error(`Task ${input.taskId} not found in project ${projectId}`);
    }
    const task = serializeTask(domainTask);
    const playbook = task.workflowInstructionId
      ? await readWorkflowInstructionById(instructionPort, task.workflowInstructionId)
      : null;
    instructions = buildRunInstructionMessages({
      runtimeKind: "task",
      projectId,
      accountId,
      connectorKind,
      taskPlaybook: playbook?.instruction ?? null,
      task: {
        id: task.id,
        title: task.title,
        acceptanceCriteria: task.acceptanceCriteria,
        targetNodeId: task.targetNodeId,
        executionDirective: extractExecutionDirective(task.context),
      },
    });
    const chatMessages = extractChatMessages(task.context);
    messages = chatMessages ?? [
      {
        role: "user" as const,
        content: `Work the task "${task.title}" (id ${task.id}) to completion.`,
      },
    ];
  } else if (runtimeKind === "scheduler" && input.scheduleId) {
    const scheduleInstruction = await instructionPort.getByKey("orchestrator.daily");
    instructions = buildRunInstructionMessages({
      runtimeKind: "scheduler",
      projectId,
      accountId,
      connectorKind,
      mainInstruction: scheduleInstruction,
    });
    messages = [
      {
        role: "user" as const,
        content: "Run the scheduled orchestration tick.",
      },
    ];
  } else {
    throw new Error(`Invalid run configuration for runtimeKind=${runtimeKind}`);
  }

  const engine = input.engine ?? createAiSdkLoopEngine();

  // Connector tools come from the active adapter (Composio by default, legacy
  // Vercel Connect when `CONNECTORS=connect`). The adapter encapsulates which
  // backend builds the tools and the per-run state the engine needs.
  const connectorBundle = adapter
    ? await adapter.buildTools({ projectId, accountId, profileId: input.profileId })
    : { tools: {} };

  const tools = {
    ...createSsotaTools(),
    ...(input.sandbox ? createSandboxTools() : {}),
    ...connectorBundle.tools,
  };

  const runInput = {
    instructions,
    messages,
    tools,
    modelId: input.modelId ?? DEFAULT_MODEL_ID,
    context: {
      projectId,
      taskId: input.taskId,
      runId,
      accountId,
      profileId: input.profileId,
    } satisfies AgentRunContext,
    sandbox: input.sandbox,
    credentials: connectorBundle.credentials,
    connectionState: connectorBundle.connectionState,
    connectionSessionManager: connectorBundle.connectionSessionManager,
    maxSteps: input.maxSteps,
  };
  return { taskPort, engine, runInput, runtimeKind };
}

function buildResult(
  result: { finishReason: string; text: string; usage?: RunAgentResult["usage"] },
  finalStatus: string | null,
): RunAgentResult {
  return {
    finishReason: result.finishReason,
    text: result.text,
    finalStatus,
    usage: result.usage,
  };
}

export async function runAgent(input: RunAgentInput): Promise<RunAgentResult> {
  const { taskPort, engine, runInput, runtimeKind } = await prepareRun(input);
  const result = await engine.run(runInput);
  let finalStatus: string | null = null;
  if (runtimeKind === "task" && input.taskId) {
    const finalTask = await taskPort.getTask(input.taskId);
    finalStatus = finalTask?.status ?? null;
  }
  return buildResult(result, finalStatus);
}

export async function streamAgent(
  input: RunAgentInput,
  writable: WritableStream,
): Promise<RunAgentResult> {
  const { taskPort, engine, runInput, runtimeKind } = await prepareRun(input);
  if (!engine.stream) {
    throw new Error("The configured engine does not support streaming");
  }
  const result = await engine.stream(runInput, writable);
  let finalStatus: string | null = null;
  if (runtimeKind === "task" && input.taskId) {
    const finalTask = await taskPort.getTask(input.taskId);
    finalStatus = finalTask?.status ?? null;
  }
  return buildResult(result, finalStatus);
}

/** @deprecated Use runAgent with runtimeKind=task */
export async function runAgentForTask(
  input: RunAgentForTaskInput,
): Promise<RunAgentResult> {
  return runAgent(input);
}

/** @deprecated Use streamAgent with runtimeKind=task */
export async function streamAgentForTask(
  input: RunAgentForTaskInput,
  writable: WritableStream,
): Promise<RunAgentResult> {
  return streamAgent(input, writable);
}
