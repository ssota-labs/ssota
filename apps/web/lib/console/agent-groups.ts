import type { AgentDefinition, AgentKind } from "@ssota/contracts";
import { getAgentDefinitionByKey } from "@ssota/contracts/agents";

export type AgentGroupKey = AgentKind | "custom";

const GROUP_ORDER: AgentGroupKey[] = ["main", "specialist", "worker", "guide", "custom"];

const GROUP_LABEL: Record<AgentGroupKey, string> = {
  main: "Main",
  specialist: "Specialist",
  worker: "Worker",
  guide: "Guide",
  custom: "Custom",
};

export function agentGroupKey(definitionKey: string): AgentGroupKey {
  const builtin = getAgentDefinitionByKey(definitionKey);
  if (builtin) return builtin.agentKind;
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
    const groupKey = agentGroupKey(definition.key);
    const list = buckets.get(groupKey) ?? [];
    list.push(definition);
    buckets.set(groupKey, list);
  }

  return GROUP_ORDER.filter((key) => (buckets.get(key)?.length ?? 0) > 0).map(
    (key) => ({
      key,
      label: GROUP_LABEL[key],
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
