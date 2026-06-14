import type {
  ContextAssertion,
  ContextAssertionKind,
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

export const CONTEXT_ASSERTION_CATALOG: Array<{
  kind: ContextAssertionKind;
  label: string;
  description: string;
}> = [
  {
    kind: "node_exists",
    label: "Node exists",
    description: "Expect at least one node of a type to exist.",
  },
  {
    kind: "property_present",
    label: "Property present",
    description: "Expect a property key to be set on context nodes.",
  },
  {
    kind: "property_equals",
    label: "Property equals",
    description: "Expect a property to match a value.",
  },
  {
    kind: "status_equals",
    label: "Status equals",
    description: "Expect lifecycle status to match.",
  },
  {
    kind: "count_at_least",
    label: "Count at least",
    description: "Expect a minimum number of matching nodes.",
  },
];

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

export function createFilterGroupFromNodeType(nodeType: string): ContextFilterGroup {
  const slug = nodeType.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  return {
    id: `fg_${slug}_${crypto.randomUUID().slice(0, 8)}`,
    nodeType,
    combinator: "and",
    conditions: [],
  };
}

export function createFilterCondition(propertyKey = "title"): ContextFilterCondition {
  return {
    id: crypto.randomUUID(),
    propertyKey,
    operator: "equals",
    value: "",
  };
}

export function createTraversalFromFilterGroup(
  filterGroup: ContextFilterGroup,
): ContextTraversalPlan {
  return {
    id: `tr_${crypto.randomUUID().slice(0, 8)}`,
    label: `From ${filterGroup.label ?? filterGroup.nodeType}`,
    startNodeRef: filterGroup.id,
    direction: "both",
    maxHops: 2,
  };
}

export function createAssertionFromKind(kind: ContextAssertionKind): ContextAssertion {
  const base = {
    id: `as_${crypto.randomUUID().slice(0, 8)}`,
    kind,
    mode: "agentic" as const,
    enforcement: "soft" as const,
    params: {},
  };

  switch (kind) {
    case "property_equals":
      return { ...base, params: { propertyKey: "title", value: "" } };
    case "property_present":
      return { ...base, params: { propertyKey: "title" } };
    case "status_equals":
      return { ...base, params: { status: "Draft" } };
    case "count_at_least":
      return { ...base, params: { nodeType: "", count: 1 } };
    case "node_exists":
    default:
      return { ...base, params: { nodeType: "" } };
  }
}

export function getAssertionKindLabel(kind: ContextAssertionKind): string {
  return (
    CONTEXT_ASSERTION_CATALOG.find((entry) => entry.kind === kind)?.label ?? kind
  );
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

export function filterGroupSummary(
  group: ContextFilterGroup,
  nodeCatalog: WorkflowNodeCatalogOption[],
): { title: string; description: string } {
  const nodeLabel = nodeCatalogLabel(nodeCatalog, group.nodeType);
  const matchLabel = group.combinator === "or" ? "Any condition" : "All conditions";
  const conditionLabel =
    group.conditions.length === 0
      ? "No property filters"
      : group.conditions.length === 1
        ? "1 condition"
        : `${group.conditions.length} conditions`;

  return {
    title: group.label ?? nodeLabel,
    description: `${nodeLabel} · ${matchLabel} · ${conditionLabel}`,
  };
}

export function traversalSummary(
  traversal: ContextTraversalPlan,
  filterGroupRefs: Array<{ id: string; label: string }>,
): { title: string; description: string } {
  const startLabel =
    filterGroupRefs.find((ref) => ref.id === traversal.startNodeRef)?.label ??
    traversal.startNodeRef;

  return {
    title: traversal.label ?? "Graph traversal",
    description: `From ${startLabel} · ${traversal.direction} · ${traversal.maxHops} hop(s)`,
  };
}

export function assertionSummary(assertion: ContextAssertion): {
  title: string;
  description: string;
} {
  const kindLabel = getAssertionKindLabel(assertion.kind);
  const paramHint =
    assertion.kind === "status_equals" && assertion.params.status
      ? ` · ${String(assertion.params.status)}`
      : assertion.kind === "property_equals" && assertion.params.value
        ? ` · ${String(assertion.params.value)}`
        : "";

  return {
    title: assertion.label ?? kindLabel,
    description: `${kindLabel} · ${assertion.mode} · ${assertion.enforcement}${paramHint}`,
  };
}
