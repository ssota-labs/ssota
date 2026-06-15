import type {
  ContextAssertion,
  ContextFilterCondition,
  ContextFilterGroup,
  ContextFilterOperator,
  ContextSpec,
  ContextTraversalPlan,
} from "@ssota/contracts";

export type WorkflowNodeCatalogOption = {
  nodeType: string;
  label: string;
  propertyKeys: string[];
};

export type WorkflowEdgeCatalogOption = {
  edgeType: string;
  label: string;
};

export const CONTEXT_FILTER_OPERATOR_LABELS: Record<ContextFilterOperator, string> = {
  equals: "equals",
  not_equals: "does not equal",
  contains: "contains",
  not_contains: "does not contain",
  is_empty: "is empty",
  is_not_empty: "is not empty",
};

export function defaultContextSpec(): ContextSpec {
  return {
    filterGroups: [],
    traversals: [],
    assertions: [],
  };
}

export function serializeWorkflowContext(context: ContextSpec): string {
  return JSON.stringify(context);
}

export function createFilterGroupDraft(nodeType: string): ContextFilterGroup {
  const slug = nodeType.toLowerCase().replace(/[^a-z0-9]+/g, "_") || "group";
  return {
    id: `fg_${slug}_${crypto.randomUUID().slice(0, 8)}`,
    nodeType,
    combinator: "and",
    conditions: [],
  };
}

/** @deprecated Use createFilterGroupDraft */
export function createFilterGroupFromNodeType(nodeType: string): ContextFilterGroup {
  return createFilterGroupDraft(nodeType);
}

export function createFilterCondition(propertyKey = "title"): ContextFilterCondition {
  return {
    id: crypto.randomUUID(),
    propertyKey,
    operator: "equals",
    value: "",
  };
}

export function createTraversalDraft(startNodeType: string): ContextTraversalPlan {
  const slug = startNodeType.toLowerCase().replace(/[^a-z0-9]+/g, "_") || "hop";
  return {
    id: `tr_${slug}_${crypto.randomUUID().slice(0, 8)}`,
    startNodeType,
    direction: "both",
    maxHops: 2,
  };
}

export function createAssertionDraft(nodeType: string): ContextAssertion {
  const slug = nodeType.toLowerCase().replace(/[^a-z0-9]+/g, "_") || "check";
  return {
    id: `as_${slug}_${crypto.randomUUID().slice(0, 8)}`,
    nodeType,
    combinator: "and",
    conditions: [createFilterCondition("lifecycle_status")],
    mode: "agentic",
    enforcement: "soft",
  };
}

export function operatorNeedsValue(operator: ContextFilterOperator): boolean {
  return operator !== "is_empty" && operator !== "is_not_empty";
}

export function nodeCatalogLabel(
  nodeCatalog: WorkflowNodeCatalogOption[],
  nodeType: string,
): string {
  return (
    nodeCatalog.find((entry) => entry.nodeType === nodeType)?.label ?? nodeType
  );
}

function conditionCountLabel(count: number, noun: string): string {
  if (count === 0) return `No ${noun}`;
  if (count === 1) return `1 ${noun}`;
  return `${count} ${noun}s`;
}

export function filterGroupSummary(
  group: ContextFilterGroup,
  nodeCatalog: WorkflowNodeCatalogOption[],
): { title: string; description: string } {
  const nodeLabel = nodeCatalogLabel(nodeCatalog, group.nodeType);
  const matchLabel = group.combinator === "or" ? "Any condition" : "All conditions";

  return {
    title: group.label ?? nodeLabel,
    description: `${nodeLabel} · ${matchLabel} · ${conditionCountLabel(group.conditions.length, "condition")}`,
  };
}

export function traversalSummary(
  traversal: ContextTraversalPlan,
  nodeCatalog: WorkflowNodeCatalogOption[],
): { title: string; description: string } {
  const startLabel = nodeCatalogLabel(nodeCatalog, traversal.startNodeType);
  const directionLabel =
    traversal.direction === "both"
      ? "Both directions"
      : traversal.direction === "outgoing"
        ? "Outgoing"
        : "Incoming";

  return {
    title: traversal.label ?? `From ${startLabel}`,
    description: `${startLabel} · ${directionLabel} · ${traversal.maxHops} hop(s)`,
  };
}

export function assertionSummary(
  assertion: ContextAssertion,
  nodeCatalog: WorkflowNodeCatalogOption[],
): { title: string; description: string } {
  const nodeLabel = nodeCatalogLabel(nodeCatalog, assertion.nodeType);
  const matchLabel = assertion.combinator === "or" ? "Any check" : "All checks";
  const firstCondition = assertion.conditions[0];
  const checkHint =
    firstCondition?.value && firstCondition.value.length > 0
      ? ` · ${firstCondition.propertyKey} ${firstCondition.operator} ${firstCondition.value}`
      : "";

  return {
    title: nodeLabel,
    description: `${matchLabel} · ${conditionCountLabel(assertion.conditions.length, "check")}${checkHint}`,
  };
}
