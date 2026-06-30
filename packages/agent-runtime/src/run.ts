import type { ModelMessage, SystemModelMessage } from "ai";
import type { AgentTrigger } from "@ssota/contracts";
import { ExecutionDirectiveSchema } from "@ssota/contracts";
import { listRoutableAgentIndex } from "@ssota/contracts/agents";
import { serializeTask, readAgentDefinitionById, readAgentDefinitionByKey } from "@ssota/core";
import { getTaskPort, getAgentDefinitionPort } from "./ports.js";
import { buildRunInstructionMessages } from "./runtime-prompt.js";
import type { AgentRuntimeKind } from "@ssota/contracts";
import {
  assertAllowedTrigger,
  mainAgentRuntimeDefinition,
  runtimeDefinitionFromAgent,
  runtimeDefinitionFromAgentKey,
  type AgentRuntimeDefinition,
} from "./runtime-definition.js";

export interface RunAgentInput {
  teamspaceId: string;
  runId: string;
  runtimeKind: AgentRuntimeKind;
  taskId?: string;
  threadId?: string;
  scheduleId?: string;
  accountId?: string;
  profileId?: string;
  modelId?: string;
  maxSteps?: number;
  chatContext?: Record<string, unknown>;
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

export interface ResolvedRunAgent {
  definition: AgentRuntimeDefinition;
  trigger: AgentTrigger;
  instructions: SystemModelMessage[];
  messages: ModelMessage[];
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

function resolveMainTrigger(input: RunAgentInput): AgentTrigger {
  if (input.chatContext?.trigger === "heartbeat") return "heartbeat";
  if (input.scheduleId) return "schedule";
  if (input.chatContext?.trigger === "chatbot") return "chatbot";
  return "chat";
}

function resolveTaskTrigger(input: RunAgentInput): AgentTrigger {
  return input.scheduleId ? "schedule" : "task";
}

/** Resolve agent definition + trigger and enforce runPolicy.allowedTriggers. */
export async function resolveRunAgentDefinition(
  input: RunAgentInput,
): Promise<{ definition: AgentRuntimeDefinition; trigger: AgentTrigger }> {
  if (input.runtimeKind === "main") {
    const definition = mainAgentRuntimeDefinition();
    const trigger = resolveMainTrigger(input);
    assertAllowedTrigger(definition, trigger);
    return { definition, trigger };
  }

  if (input.runtimeKind === "task" && input.taskId) {
    const taskPort = getTaskPort(input.teamspaceId, input.accountId);
    const domainTask = await taskPort.getTask(input.taskId);
    if (!domainTask) {
      throw new Error(`Task ${input.taskId} not found in teamspace ${input.teamspaceId}`);
    }
    const task = serializeTask(domainTask);
    const instructionPort = getAgentDefinitionPort(input.teamspaceId, input.accountId);

    let definition: AgentRuntimeDefinition | null = null;
    if (task.agentDefinitionId) {
      const loaded = await readAgentDefinitionById(
        instructionPort,
        task.agentDefinitionId,
      );
      if (loaded) {
        definition = runtimeDefinitionFromAgent(loaded.definition);
      }
    } else if (task.agentKey) {
      definition = runtimeDefinitionFromAgentKey(task.agentKey);
      if (!definition) {
        const loaded = await readAgentDefinitionByKey(instructionPort, task.agentKey);
        if (loaded) {
          definition = runtimeDefinitionFromAgent(loaded.definition);
        }
      }
    }

    if (!definition) {
      throw new Error(
        `Task ${input.taskId} has no resolvable agent (agentKey=${task.agentKey ?? "null"}).`,
      );
    }

    const trigger = resolveTaskTrigger(input);
    assertAllowedTrigger(definition, trigger);
    return { definition, trigger };
  }

  throw new Error(`Invalid run configuration for runtimeKind=${input.runtimeKind}`);
}

export async function buildRunPrompt(
  input: RunAgentInput,
): Promise<{ instructions: SystemModelMessage[]; messages: ModelMessage[] }> {
  const resolved = await resolveRunAgent(input);
  return {
    instructions: resolved.instructions,
    messages: resolved.messages,
  };
}

/** Full run resolution: definition, trigger, instructions, and messages. */
export async function resolveRunAgent(input: RunAgentInput): Promise<ResolvedRunAgent> {
  const { teamspaceId, accountId, runtimeKind } = input;
  const { definition, trigger } = await resolveRunAgentDefinition(input);
  const instructionPort = getAgentDefinitionPort(teamspaceId, accountId);

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
  }

  return { definition, trigger, instructions, messages };
}
