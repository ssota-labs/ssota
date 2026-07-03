import type { AgentDefinition } from "@ssota/contracts";
import { isBuiltinAgentId } from "@ssota/contracts/agents";

export type AgentGroupKey = "main" | "agents" | "reference" | "custom";

const GROUP_ORDER: AgentGroupKey[] = [
  "main",
  "agents",
  "reference",
  "custom",
];

export const AGENT_GROUP_LABEL: Record<AgentGroupKey, string> = {
  main: "Main",
  agents: "Agents",
  reference: "Reference",
  custom: "Custom",
};

/** @deprecated Use AGENT_GROUP_LABEL */
const GROUP_LABEL = AGENT_GROUP_LABEL;

export function agentGroupKey(definition: AgentDefinition): AgentGroupKey {
  if (definition.isMain) return "main";
  if (definition.referenceOnly) return "reference";
  if (isBuiltinAgentId(definition.id)) return "agents";
  return "custom";
}

export function groupAgentDefinitions(
  definitions: AgentDefinition[],
): Array<{
  key: AgentGroupKey;
  label: string;
  items: AgentDefinition[];
}> {
  const buckets = new Map<AgentGroupKey, AgentDefinition[]>();

  for (const definition of definitions) {
    const groupKey = agentGroupKey(definition);
    const list = buckets.get(groupKey) ?? [];
    list.push(definition);
    buckets.set(groupKey, list);
  }

  return GROUP_ORDER.filter((key) => (buckets.get(key)?.length ?? 0) > 0).map(
    (key) => ({
      key,
      label: AGENT_GROUP_LABEL[key],
      items: [...(buckets.get(key) ?? [])].sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    }),
  );
}

/** @deprecated Use groupAgentDefinitions */
export const groupWorkflowInstructions = groupAgentDefinitions;

/** @deprecated Use AgentGroupKey */
export type WorkflowInstructionGroupKey = AgentGroupKey;

/** @deprecated Use agentGroupKey */
export const workflowInstructionGroupKey = agentGroupKey;
