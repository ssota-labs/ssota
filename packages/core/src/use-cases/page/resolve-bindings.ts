import type { BindingDef } from "@ssota/contracts";
import type { GraphReadPort } from "../../ports/graph-read-port.js";
import type { GraphNode } from "../../domain/graph-types.js";

/** Node shape handed to the page renderer (matches its `MockNode`). */
export interface ResolvedNode {
  id: string;
  catalogKey: string;
  title: string;
  properties: Record<string, unknown>;
}

function serialize(node: GraphNode): ResolvedNode {
  return {
    id: node.id,
    catalogKey: node.catalogKey,
    title: node.title,
    properties: node.properties,
  };
}

type QueryFilter = NonNullable<Extract<BindingDef, { kind: "query" }>["filter"]>;

function matchesFilter(node: GraphNode, filter: QueryFilter): boolean {
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

/**
 * Resolve a page's bindings against the real graph (production counterpart of
 * the lab `resolveSandboxBindings`). Returns a data context keyed by binding
 * name — arrays for `query`/`traverse`, a single node (or null) for
 * `singleton`/`node`. `accountId` is threaded for Phase 5 tenant scoping; the
 * read port ignores it until then.
 */
export async function resolvePageBindings(
  graph: GraphReadPort,
  projectId: string,
  bindings: Record<string, BindingDef>,
  context: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const cache = new Map<string, unknown>();

  async function resolve(
    key: string,
    def: BindingDef,
    stack: Set<string>,
  ): Promise<unknown> {
    if (cache.has(key)) return cache.get(key);
    if (stack.has(key)) {
      throw new Error(`Circular binding reference: ${key}`);
    }
    stack.add(key);

    let value: unknown = null;
    switch (def.kind) {
      case "query": {
        const nodes = await graph.queryNodes({
          projectId,
          catalogKey: def.catalogKey,
        });
        const filtered = def.filter?.length
          ? nodes.filter((n) => matchesFilter(n, def.filter as QueryFilter))
          : nodes;
        value = filtered.map(serialize);
        break;
      }
      case "singleton": {
        const nodes = await graph.queryNodes({
          projectId,
          catalogKey: def.catalogKey,
          limit: 1,
        });
        value = nodes[0] ? serialize(nodes[0]) : null;
        break;
      }
      case "node": {
        const node = await graph.getNodeById(def.nodeId);
        value = node && node.projectId === projectId ? serialize(node) : null;
        break;
      }
      case "traverse": {
        const fromDef = bindings[def.from];
        const from = fromDef
          ? await resolve(def.from, fromDef, stack)
          : (context[def.from] ?? null);
        const sourceId =
          from && typeof from === "object" && "id" in from
            ? String((from as ResolvedNode).id)
            : null;
        if (!sourceId) {
          value = [];
          break;
        }
        const edges = await graph.traverseEdges({
          projectId,
          nodeId: sourceId,
          catalogKey: def.edgeCatalogKey,
          direction: def.direction === "in" ? "incoming" : "outgoing",
        });
        const targetIds = edges.map((edge) =>
          def.direction === "in" ? edge.sourceNodeId : edge.targetNodeId,
        );
        const targets = await Promise.all(
          targetIds.map((id) => graph.getNodeById(id)),
        );
        value = targets
          .filter((n): n is GraphNode => n !== null && n.projectId === projectId)
          .map(serialize);
        break;
      }
      case "ref": {
        const target = bindings[def.binding];
        value = target ? await resolve(def.binding, target, stack) : null;
        break;
      }
      case "artifact": {
        let node: GraphNode | null = null;
        if (def.nodeId) {
          node = await graph.getNodeById(def.nodeId);
        } else if (def.ref) {
          const refDef = bindings[def.ref];
          const refVal = refDef
            ? await resolve(def.ref, refDef, stack)
            : (context[def.ref] ?? null);
          const id =
            refVal && typeof refVal === "object" && "id" in refVal
              ? String((refVal as ResolvedNode).id)
              : null;
          node = id ? await graph.getNodeById(id) : null;
        }
        if (!node || node.projectId !== projectId) {
          value = { status: "unbuilt" as const };
          break;
        }
        const buildHash = node.properties.buildHash;
        const artifactPath = node.properties.previewArtifactPath;
        value =
          typeof buildHash === "string" && buildHash.length > 0
            ? {
                status: "built" as const,
                nodeId: node.id,
                buildId: buildHash,
                artifactPath:
                  typeof artifactPath === "string" ? artifactPath : undefined,
              }
            : { status: "unbuilt" as const, nodeId: node.id };
        break;
      }
    }

    stack.delete(key);
    cache.set(key, value);
    return value;
  }

  const out: Record<string, unknown> = { ...context };
  for (const [key, def] of Object.entries(bindings)) {
    out[key] = await resolve(key, def, new Set());
  }
  return out;
}
