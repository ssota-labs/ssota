import type {
  AgentDefinition,
  AgentTrigger,
  NodeScope,
  ToolBundle,
} from "@ssota/contracts";
import {
  BUILTIN_AGENT_IDS,
  getAgentDefinitionById,
} from "@ssota/contracts/agents";

export interface AgentRuntimeDefinition {
  agentDefinitionId: string;
  isMain: boolean;
  toolBundles: ToolBundle[];
  nodeScopes: NodeScope[];
  allowedTriggers: AgentTrigger[] | null;
}

/** Builtin main agent definition (always available without DB). */
export function mainAgentRuntimeDefinition(): AgentRuntimeDefinition {
  const builtin = getAgentDefinitionById(BUILTIN_AGENT_IDS.main);
  return {
    agentDefinitionId: BUILTIN_AGENT_IDS.main,
    isMain: true,
    toolBundles: builtin?.toolBundles ?? [
      "graph.read",
      "graph.write",
      "tasks.manage",
      "pages.author",
      "connectors",
      "delegate",
    ],
    nodeScopes: builtin?.nodeScopes ?? [],
    allowedTriggers: builtin?.runPolicy.allowedTriggers ?? null,
  };
}

export function runtimeDefinitionFromAgent(
  definition: Pick<
    AgentDefinition,
    "id" | "isMain" | "toolBundles" | "nodeScopes" | "runPolicy"
  >,
): AgentRuntimeDefinition {
  return {
    agentDefinitionId: definition.id,
    isMain: definition.isMain,
    toolBundles: definition.toolBundles,
    nodeScopes: definition.nodeScopes,
    allowedTriggers: definition.runPolicy.allowedTriggers ?? null,
  };
}

export function runtimeDefinitionFromBuiltinId(
  agentDefinitionId: string,
): AgentRuntimeDefinition | null {
  const builtin = getAgentDefinitionById(agentDefinitionId);
  if (!builtin) return null;
  return {
    agentDefinitionId: builtin.id,
    isMain: builtin.isMain,
    toolBundles: builtin.toolBundles,
    nodeScopes: builtin.nodeScopes,
    allowedTriggers: builtin.runPolicy.allowedTriggers ?? null,
  };
}

export class TriggerNotAllowedError extends Error {
  constructor(trigger: AgentTrigger, allowed: AgentTrigger[]) {
    super(
      `Trigger "${trigger}" is not allowed for this agent (allowed: ${allowed.join(", ")}).`,
    );
    this.name = "TriggerNotAllowedError";
  }
}

export function assertAllowedTrigger(
  definition: AgentRuntimeDefinition,
  trigger: AgentTrigger,
): void {
  const allowed = definition.allowedTriggers;
  if (!allowed?.length) return;
  if (!allowed.includes(trigger)) {
    throw new TriggerNotAllowedError(trigger, allowed);
  }
}
