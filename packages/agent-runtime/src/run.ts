import type { ModelMessage, SystemModelMessage } from "ai";
import { ExecutionDirectiveSchema } from "@ssota/contracts";
import { listBuiltinWorkflowIndex } from "@ssota/contracts/workflows";
import { serializeTask, readWorkflowInstructionById } from "@ssota/core";
import { getTaskPort, getWorkflowInstructionPort } from "./ports.js";
import { getConnectorAdapter } from "./connectors/adapter.js";
import { buildRunInstructionMessages } from "./runtime-prompt.js";
import type { AgentRuntimeKind } from "@ssota/contracts";

/**
 * Per-run scope used to build the agent prompt. The actual agent loop now runs
 * on the WorkflowAgent (apps/web); this module only produces the serializable
 * instructions + messages via {@link buildRunPrompt}.
 */
export interface RunAgentInput {
  teamspaceId: string;
  runId: string;
  runtimeKind: AgentRuntimeKind;
  taskId?: string;
  threadId?: string;
  scheduleId?: string;
  accountId?: string;
  /**
   * Signed-in user (Supabase `auth.users.id`) driving this run. With the org it
   * forms the Composio entity for connector tools. Absent on scheduler /
   * autonomous runs → Composio connectors fall back to the org-shared entity.
   */
  profileId?: string;
  modelId?: string;
  maxSteps?: number;
  /** Main-runtime chat transcript injected from the web chat route. */
  chatContext?: Record<string, unknown>;
}

/** Result shape persisted by the run finalizers. */
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

/**
 * Build the per-run instruction + message prompt for a runtime kind. Both
 * outputs are serializable (SystemModelMessage[] / ModelMessage[]), so the
 * WorkflowAgent path can produce them inside a `"use step"` and hand them to
 * the workflow-safe agent builder. The active connector adapter's kind drives
 * the prompt's connections guidance (Composio vs legacy tool names).
 */
export async function buildRunPrompt(
  input: RunAgentInput,
): Promise<{ instructions: SystemModelMessage[]; messages: ModelMessage[] }> {
  const { teamspaceId, accountId, runtimeKind } = input;
  const instructionPort = getWorkflowInstructionPort(teamspaceId, accountId);

  const adapter = getConnectorAdapter();
  const connectorKind = adapter?.kind;

  let instructions: SystemModelMessage[] = [];
  let messages: ModelMessage[] = [];

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
      teamspaceId,
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
    const taskPort = getTaskPort(teamspaceId, accountId);
    const domainTask = await taskPort.getTask(input.taskId);
    if (!domainTask) {
      throw new Error(`Task ${input.taskId} not found in teamspace ${teamspaceId}`);
    }
    const task = serializeTask(domainTask);
    const playbook = task.workflowInstructionId
      ? await readWorkflowInstructionById(instructionPort, task.workflowInstructionId)
      : null;
    instructions = buildRunInstructionMessages({
      runtimeKind: "task",
      teamspaceId,
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
      teamspaceId,
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

  return { instructions, messages };
}
