import type { ActionCatalogEntry, NodeCatalogEntry } from "@ssota/contracts";

export function resolveActionsForNodeType(
  nodeEntry: NodeCatalogEntry,
  allActions: ActionCatalogEntry[],
): ActionCatalogEntry[] {
  const localActions = allActions.filter((action) => {
    if (nodeEntry.allowedActionRefs.includes(action.actionType)) return true;
    if (action.scope.kind === "node_type") {
      return action.scope.nodeType === nodeEntry.nodeType;
    }
    if (action.scope.kind === "property") {
      return action.scope.nodeType === nodeEntry.nodeType;
    }
    return false;
  });
  return localActions.length ? localActions : allActions;
}

export function enabledActionTypesForBinding(
  nodeEntry: NodeCatalogEntry,
  allActions: ActionCatalogEntry[],
  disabledActions: string[],
): string[] {
  return resolveActionsForNodeType(nodeEntry, allActions)
    .map((action) => action.actionType)
    .filter((actionType) => !disabledActions.includes(actionType));
}
