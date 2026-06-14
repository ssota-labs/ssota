import type {
  ActionCatalogEntry,
  NodeCatalogEntry,
  WorkflowNodeBinding,
} from "@ssota/contracts";
import {
  enabledActionTypesForBinding,
  resolveActionsForNodeType,
} from "@/lib/graph/resolve-node-actions";

export function normalizeNodeBindingsFromWorkflow(
  nodeBindings: WorkflowNodeBinding[],
  applicableNodeTypes: string[],
): WorkflowNodeBinding[] {
  if (nodeBindings.length > 0) return nodeBindings;
  return applicableNodeTypes.map((nodeType) => ({
    nodeType,
    disabledActions: [],
  }));
}

export function syncWorkflowNodeCatalogFields(
  nodeBindings: WorkflowNodeBinding[],
  nodeCatalog: NodeCatalogEntry[],
  actionCatalog: ActionCatalogEntry[],
): {
  nodeBindings: WorkflowNodeBinding[];
  applicableNodeTypes: string[];
  allowedActions: string[];
} {
  const applicableNodeTypes = nodeBindings.map((binding) => binding.nodeType);
  const enabledActions = new Set<string>();

  for (const binding of nodeBindings) {
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
    nodeBindings,
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
