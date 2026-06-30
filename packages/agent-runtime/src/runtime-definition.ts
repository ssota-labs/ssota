import type {
  AgentDefinition,
  AgentKind,
  AgentTrigger,
  NodeScope,
  ToolBundle,
} from "@ssota/contracts";
import { getAgentDefinitionByKey } from "@ssota/contracts/agents";

export interface AgentRuntimeDefinition {
  agentKey: string;
  agentKind: AgentKind;
  agentDefinitionId?: string;
  toolBundles: ToolBundle[];
  nodeScopes: NodeScope[];
  allowedTriggers: AgentTrigger[] | null;
}

const MAIN_AGENT_KEY = "main.ssota";

/** Builtin main agent definition (always available without DB). */
export function mainAgentRuntimeDefinition(): AgentRuntimeDefinition {
  const builtin = getAgentDefinitionByKey(MAIN_AGENT_KEY);
  return {
    agentKey: MAIN_AGENT_KEY,
    agentKind: builtin?.agentKind ?? "main",
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
    "id" | "key" | "agentKind" | "toolBundles" | "nodeScopes" | "runPolicy"
  >,
): AgentRuntimeDefinition {
  return {
    agentKey: definition.key,
    agentKind: definition.agentKind,
    agentDefinitionId: definition.id,
    toolBundles: definition.toolBundles,
    nodeScopes: definition.nodeScopes,
    allowedTriggers: definition.runPolicy.allowedTriggers ?? null,
  };
}

export function runtimeDefinitionFromAgentKey(
  agentKey: string,
): AgentRuntimeDefinition | null {
  const builtin = getAgentDefinitionByKey(agentKey);
  if (!builtin) return null;
  return {
    agentKey: builtin.agentKey,
    agentKind: builtin.agentKind,
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
