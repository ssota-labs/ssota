import type { BindingDef } from "@ssota/contracts";
import type { LabSandboxState, MockEdge, MockNode } from "./types";

export type BindingContext = Record<string, unknown>;

function matchesFilter(
  node: MockNode,
  filter: NonNullable<Extract<BindingDef, { kind: "query" }>["filter"]>,
): boolean {
  for (const clause of filter) {
    const value = node.properties[clause.key];
    if (clause.op === "exists") {
      if (value === undefined || value === null) return false;
      continue;
    }
    if (clause.op === "eq" && value !== clause.value) return false;
    if (clause.op === "neq" && value === clause.value) return false;
  }
  return true;
}

function resolveBinding(
  state: LabSandboxState,
  key: string,
  def: BindingDef,
  context: BindingContext,
  stack: Set<string>,
): unknown {
  if (stack.has(key)) {
    throw new Error(`Circular binding reference: ${key}`);
  }
  stack.add(key);

  try {
    switch (def.kind) {
      case "query": {
        let rows = state.nodes.filter((n) => n.catalogKey === def.catalogKey);
        if (def.filter?.length) {
          rows = rows.filter((n) => matchesFilter(n, def.filter!));
        }
        return rows;
      }
      case "singleton": {
        const found = state.nodes.find((n) => n.catalogKey === def.catalogKey);
        if (found) return found;
        if (def.ensure) {
          return {
            id: `virtual-${def.catalogKey}`,
            catalogKey: def.catalogKey,
            title: `(virtual ${def.catalogKey})`,
            properties: { lifecycleStatus: "Draft" },
          } satisfies MockNode;
        }
        return null;
      }
      case "node":
        return state.nodes.find((n) => n.id === def.nodeId) ?? null;
      case "traverse": {
        const from = context[def.from];
        const sourceId =
          from && typeof from === "object" && "id" in from
            ? String((from as MockNode).id)
            : null;
        if (!sourceId) return [];
        return traverseEdges(state.edges, sourceId, def.edgeCatalogKey, def.direction);
      }
      case "ref": {
        const target = def.binding;
        const targetDef = context.__bindings as
          | Record<string, BindingDef>
          | undefined;
        if (!targetDef?.[target]) {
          throw new Error(`Unknown ref binding '${target}'`);
        }
        return resolveBinding(state, target, targetDef[target], context, stack);
      }
      default:
        return null;
    }
  } finally {
    stack.delete(key);
  }
}

function traverseEdges(
  edges: MockEdge[],
  nodeId: string,
  edgeCatalogKey: string,
  direction: "out" | "in",
): MockNode[] {
  void edges;
  void nodeId;
  void edgeCatalogKey;
  void direction;
  return [];
}

export function resolveSandboxBindings(
  state: LabSandboxState,
  bindings: Record<string, BindingDef>,
  context: Record<string, unknown> = {},
): BindingContext {
  const enriched: BindingContext = {
    ...context,
    __bindings: bindings,
  };
  for (const [key, def] of Object.entries(bindings)) {
    enriched[key] = resolveBinding(state, key, def, enriched, new Set());
  }
  return enriched;
}
