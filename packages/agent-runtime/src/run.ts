import type { ModelMessage, SystemModelMessage } from "ai";
import type { AgentTrigger } from "@ssota/contracts";
import { ExecutionDirectiveSchema } from "@ssota/contracts";
import { getAgentDefinitionById, BUILTIN_AGENT_IDS } from "@ssota/contracts/agents";
import { serializeTask, readAgentDefinitionById } from "@ssota/core";
import { getTaskPort, getAgentDefinitionPort, getSkillPort, getTeamspaceMainConfigPort, ensureTeamspaceOrganizationScope } from "./ports.js";
import { buildRunInstructionMessages } from "./runtime-prompt.js";
import { resolveSkillManifest } from "./skill-manifest.js";
import type { AgentRuntimeKind } from "@ssota/contracts";
import {
  assertAllowedTrigger,
  mainAgentRuntimeDefinition,
  runtimeDefinitionFromAgent,
  runtimeDefinitionFromBuiltinId,
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
  /** When set on main runtime, run this agent definition instead of the main agent. */
  agentDefinitionId?: string;
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
  if (input.chatContext?.trigger === "manual") return "manual";
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
    const instructionPort = getAgentDefinitionPort(input.teamspaceId, input.accountId);

    if (input.agentDefinitionId && input.agentDefinitionId !== BUILTIN_AGENT_IDS.main) {
      const loaded = await instructionPort.getById(input.agentDefinitionId);
      if (!loaded) {
        throw new Error(
          `Agent definition ${input.agentDefinitionId} not found in teamspace ${input.teamspaceId}`,
        );
      }
      const definition = runtimeDefinitionFromAgent(loaded);
      const trigger = resolveMainTrigger(input);
      assertAllowedTrigger(definition, trigger);
      return { definition, trigger };
    }

    const mainConfigPort = getTeamspaceMainConfigPort();
    const mainConfig = await mainConfigPort.getMainConfig(input.teamspaceId);
    const definition = mainAgentRuntimeDefinition(mainConfig);
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
      } else {
        definition = runtimeDefinitionFromBuiltinId(task.agentDefinitionId);
      }
    }

    if (!definition) {
      throw new Error(
        `Task ${input.taskId} has no resolvable agent (agentDefinitionId=${task.agentDefinitionId ?? "null"}).`,
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
    const organizationId = await ensureTeamspaceOrganizationScope(teamspaceId);
    const skillManifest = await resolveSkillManifest(
      getSkillPort(organizationId),
      organizationId,
      definition.agentDefinitionId,
    );

    if (!definition.isMain) {
      const playbook = await readAgentDefinitionById(
        instructionPort,
        definition.agentDefinitionId,
      );
      instructions = buildRunInstructionMessages({
        runtimeKind: "main",
        teamspaceId,
        accountId,
        skillManifest,
        specialistChatPlaybook: playbook?.definition ?? null,
      });
    } else {
      const mainConfigPort = getTeamspaceMainConfigPort();
      const mainConfig = await mainConfigPort.getMainConfig(teamspaceId);
      const dbDefinitions = await instructionPort.listDefinitions();
      const agentManifest = dbDefinitions.map((w) => ({
        id: w.id,
        name: w.name,
        description: w.description,
      }));
      instructions = buildRunInstructionMessages({
        runtimeKind: "main",
        teamspaceId,
        accountId,
        agentManifest,
        skillManifest,
        mainConfig,
      });
    }

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
    let playbook = task.agentDefinitionId
      ? await readAgentDefinitionById(instructionPort, task.agentDefinitionId)
      : null;
    if (!playbook && task.agentDefinitionId) {
      const builtin = getAgentDefinitionById(task.agentDefinitionId);
      if (builtin) {
        playbook = {
          source: "db" as const,
          definition: {
            id: builtin.id,
            teamspaceId,
            accountId: null,
            name: builtin.title,
            description: builtin.description,
            instructions: [],
            toolBundles: builtin.toolBundles,
            nodeScopes: builtin.nodeScopes,
            runPolicy: builtin.runPolicy,
            createdAt: new Date(0).toISOString(),
            updatedAt: new Date(0).toISOString(),
          },
        };
      }
    }
    const organizationId = await ensureTeamspaceOrganizationScope(teamspaceId);
    const skillPort = getSkillPort(organizationId);
    const skillManifest = task.agentDefinitionId
      ? await resolveSkillManifest(
          skillPort,
          organizationId,
          task.agentDefinitionId,
        )
      : [];
    instructions = buildRunInstructionMessages({
      runtimeKind: "task",
      teamspaceId,
      accountId,
      taskPlaybook: playbook?.definition ?? null,
      skillManifest,
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
