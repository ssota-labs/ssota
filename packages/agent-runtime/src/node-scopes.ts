import type { NodeScope } from "@ssota/contracts";

export interface ResolvedNodeScope {
  catalogKeys: Set<string> | null;
  nodeIds: Set<string> | null;
}

/** Union scopes from an agent definition; `null` means unrestricted graph access. */
export function resolveNodeScopes(scopes: NodeScope[] | undefined): ResolvedNodeScope | null {
  if (!scopes?.length) return null;

  const catalogKeys = new Set<string>();
  const nodeIds = new Set<string>();
  let hasCatalogKeys = false;
  let hasNodeIds = false;

  for (const scope of scopes) {
    if (scope.catalogKeys?.length) {
      hasCatalogKeys = true;
      for (const key of scope.catalogKeys) catalogKeys.add(key);
    }
    if (scope.nodeIds?.length) {
      hasNodeIds = true;
      for (const id of scope.nodeIds) nodeIds.add(id);
    }
  }

  if (!hasCatalogKeys && !hasNodeIds) return null;
  return {
    catalogKeys: hasCatalogKeys ? catalogKeys : null,
    nodeIds: hasNodeIds ? nodeIds : null,
  };
}

export class NodeScopeViolation extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NodeScopeViolation";
  }
}

export function assertCatalogKeyInScope(
  scope: ResolvedNodeScope | null,
  catalogKey: string,
  action: string,
): void {
  if (!scope?.catalogKeys) return;
  if (!scope.catalogKeys.has(catalogKey)) {
    throw new NodeScopeViolation(
      `${action} on catalog "${catalogKey}" is outside this agent's nodeScopes.`,
    );
  }
}

export function assertNodeIdInScope(
  scope: ResolvedNodeScope | null,
  nodeId: string,
  action: string,
): void {
  if (!scope?.nodeIds) return;
  if (!scope.nodeIds.has(nodeId)) {
    throw new NodeScopeViolation(
      `${action} on node ${nodeId} is outside this agent's nodeScopes.`,
    );
  }
}
