import {
  WorkflowApplicableNodeTypeSchema,
  type ActionCatalogEntry,
  type NodeCatalogEntry,
  type WorkflowApplicableNodeType,
} from "@ssota/contracts";
import {
  enabledActionTypesForBinding,
  resolveActionsForNodeType,
} from "@/lib/graph/resolve-node-actions";

export function normalizeApplicableNodeTypesFromWorkflow(
  applicableNodeTypes: WorkflowApplicableNodeType[],
  legacyApplicableNodeTypeNames: string[],
): WorkflowApplicableNodeType[] {
  if (applicableNodeTypes.length > 0) return applicableNodeTypes;
  return legacyApplicableNodeTypeNames.map((nodeType) => ({
    nodeType,
    disabledActions: [],
  }));
}

export function syncWorkflowNodeCatalogFields(
  applicableNodeTypes: WorkflowApplicableNodeType[],
  nodeCatalog: NodeCatalogEntry[],
  actionCatalog: ActionCatalogEntry[],
): {
  applicableNodeTypes: WorkflowApplicableNodeType[];
  allowedActions: string[];
} {
  const enabledActions = new Set<string>();

  for (const binding of applicableNodeTypes) {
    const entry = nodeCatalog.find((node) => node.nodeType === binding.nodeType);
    if (!entry) continue;
    for (const actionType of enabledActionTypesForBinding(
      entry,
      actionCatalog,
      binding.disabledActions,
    )) {
      enabledActions.add(actionType);
    }
  }

  return {
    applicableNodeTypes,
    allowedActions: [...enabledActions],
  };
}

export function countActionsForNodeType(
  nodeEntry: NodeCatalogEntry,
  actionCatalog: ActionCatalogEntry[],
): number {
  return resolveActionsForNodeType(nodeEntry, actionCatalog).length;
}

export function serializeApplicableNodeTypes(
  applicableNodeTypes: WorkflowApplicableNodeType[],
): string {
  return JSON.stringify(applicableNodeTypes);
}

export function parseApplicableNodeTypes(
  value: FormDataEntryValue | null,
): WorkflowApplicableNodeType[] {
  const raw = String(value ?? "").trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((entry) => WorkflowApplicableNodeTypeSchema.parse(entry));
  } catch {
    return [];
  }
}
