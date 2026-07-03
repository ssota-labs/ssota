import type {
  AgentTrigger,
  NodeScope,
  TeamspaceMainConfig,
  ToolBundle,
} from "@ssota/contracts";
import {
  DEFAULT_MAIN_TOOL_BUNDLES,
  DEFAULT_MAIN_RUN_POLICY,
} from "@ssota/contracts";
import {
  BUILTIN_AGENT_IDS,
  getAgentDefinitionById,
  MAIN_AGENT_ID,
} from "@ssota/contracts/agents";

export interface AgentRuntimeDefinition {
  agentDefinitionId: string;
  isMain: boolean;
  toolBundles: ToolBundle[];
  nodeScopes: NodeScope[];
  allowedTriggers: AgentTrigger[] | null;
  /** Composio toolkit slugs the agent may use; empty/omitted = no connector tools. */
  enabledConnectorProviders?: string[];
}

/** Builtin main agent definition merged with optional teamspace overrides. */
export function mainAgentRuntimeDefinition(
  config?: Pick<TeamspaceMainConfig, "toolBundles" | "runPolicy"> | null,
): AgentRuntimeDefinition {
  const builtin = getAgentDefinitionById(BUILTIN_AGENT_IDS.main);
  return {
    agentDefinitionId: BUILTIN_AGENT_IDS.main,
    isMain: true,
    toolBundles:
      config?.toolBundles && config.toolBundles.length > 0
        ? config.toolBundles
        : (builtin?.toolBundles ?? [...DEFAULT_MAIN_TOOL_BUNDLES]),
    nodeScopes: builtin?.nodeScopes ?? [],
    allowedTriggers:
      config?.runPolicy.allowedTriggers ??
      builtin?.runPolicy.allowedTriggers ??
      [...DEFAULT_MAIN_RUN_POLICY.allowedTriggers],
    enabledConnectorProviders:
      config?.runPolicy.enabledConnectorProviders ??
      builtin?.runPolicy.enabledConnectorProviders ??
      [],
  };
}

export function runtimeDefinitionFromAgent(
  definition: Pick<
    import("@ssota/contracts").AgentDefinition,
    "id" | "toolBundles" | "nodeScopes" | "runPolicy"
  >,
): AgentRuntimeDefinition {
  return {
    agentDefinitionId: definition.id,
    isMain: false,
    toolBundles: definition.toolBundles,
    nodeScopes: definition.nodeScopes,
    allowedTriggers: definition.runPolicy.allowedTriggers ?? null,
    enabledConnectorProviders:
      definition.runPolicy.enabledConnectorProviders ?? [],
  };
}

export function runtimeDefinitionFromBuiltinId(
  agentDefinitionId: string,
): AgentRuntimeDefinition | null {
  const builtin = getAgentDefinitionById(agentDefinitionId);
  if (!builtin) return null;
  return {
    agentDefinitionId: builtin.id,
    isMain: builtin.id === MAIN_AGENT_ID,
    toolBundles: builtin.toolBundles,
    nodeScopes: builtin.nodeScopes,
    allowedTriggers: builtin.runPolicy.allowedTriggers ?? null,
    enabledConnectorProviders:
      builtin.runPolicy.enabledConnectorProviders ?? [],
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
