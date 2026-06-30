import type { ModelMessage, SystemModelMessage } from "ai";
import { ExecutionDirectiveSchema } from "@ssota/contracts";
import { listRoutableAgentIndex } from "@ssota/contracts/agents";
import { serializeTask, readAgentDefinitionById } from "@ssota/core";
import { getTaskPort, getAgentDefinitionPort } from "./ports.js";
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
  const instructionPort = getAgentDefinitionPort(teamspaceId, accountId);

  const adapter = getConnectorAdapter();
  const connectorKind = adapter?.kind;

  let instructions: SystemModelMessage[] = [];
  let messages: ModelMessage[] = [];

  if (runtimeKind === "main") {
    const dbDefinitions = await instructionPort.listDefinitions();
    const dbKeys = new Set(dbDefinitions.map((w) => w.key));
    const builtins = listRoutableAgentIndex().filter((b) => !dbKeys.has(b.key));
    const agentManifest = [
      ...dbDefinitions.map((w) => ({
        key: w.key,
        name: w.name,
        description: w.description,
        agentKind: w.agentKind,
      })),
      ...builtins,
    ];
    instructions = buildRunInstructionMessages({
      runtimeKind: "main",
      teamspaceId,
      accountId,
      connectorKind,
      agentManifest,
    });
    const chatMessages = extractChatMessages(input.chatContext);
    messages = chatMessages ?? [
      {
        role: "user" as const,
        content:
          input.chatContext?.trigger === "heartbeat"
            ? "Run the scheduled heartbeat tick for this project."
            : "Continue the conversation and help the user.",
      },
    ];
  } else if (runtimeKind === "task" && input.taskId) {
    const taskPort = getTaskPort(teamspaceId, accountId);
    const domainTask = await taskPort.getTask(input.taskId);
    if (!domainTask) {
      throw new Error(`Task ${input.taskId} not found in teamspace ${teamspaceId}`);
    }
    const task = serializeTask(domainTask);
    const playbook = task.agentDefinitionId
      ? await readAgentDefinitionById(instructionPort, task.agentDefinitionId)
      : null;
    instructions = buildRunInstructionMessages({
      runtimeKind: "task",
      teamspaceId,
      accountId,
      connectorKind,
      taskPlaybook: playbook?.definition ?? null,
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
  } else {
    throw new Error(`Invalid run configuration for runtimeKind=${runtimeKind}`);
  }

  return { instructions, messages };
}
