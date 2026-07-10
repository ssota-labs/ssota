import type { AttachChildren, BindingDef } from "@ssota/contracts";
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

/** Page context: same teamspace or org-shared (teamspace_id null). */
function canReadNodeInTeamspace(node: GraphNode, pageTeamspaceId: string): boolean {
  return node.teamspaceId === null || node.teamspaceId === pageTeamspaceId;
}

type QueryFilter = NonNullable<Extract<BindingDef, { kind: "query" }>["filter"]>;

/**
 * Compare two property values for the ordering ops. Numeric when BOTH parse as
 * finite numbers (so `quantity <= reorder_point` works with string/number mix);
 * otherwise lexical (ISO `date`/timestamp strings sort correctly). Returns null
 * when a side is missing/incomparable — an ordering clause then never matches.
 */
function compareValues(a: unknown, b: unknown): number | null {
  if (a === null || a === undefined || a === "" || b === null || b === undefined || b === "") {
    return null;
  }
  const na = Number(a);
  const nb = Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
  const sa = String(a);
  const sb = String(b);
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}

export function matchesFilter(node: GraphNode, filter: QueryFilter): boolean {
  for (const clause of filter) {
    const value = node.properties[clause.key];
    if (clause.op === "exists") {
      if (value === undefined || value === null) return false;
      continue;
    }
    if (clause.op === "eq" && value !== clause.value) return false;
    if (clause.op === "neq" && value === clause.value) return false;
    if (clause.op === "gt" || clause.op === "gte" || clause.op === "lt" || clause.op === "lte") {
      const c = compareValues(value, clause.value);
      if (c === null) return false;
      if (clause.op === "gt" && !(c > 0)) return false;
      if (clause.op === "gte" && !(c >= 0)) return false;
      if (clause.op === "lt" && !(c < 0)) return false;
      if (clause.op === "lte" && !(c <= 0)) return false;
    }
  }
  return true;
}

function filterByCatalogKey(
  nodes: GraphNode[],
  catalogKey: string | undefined,
): GraphNode[] {
  if (!catalogKey) return nodes;
  return nodes.filter((node) => node.catalogKey === catalogKey);
}

async function attachChildrenToNodes(
  graph: GraphReadPort,
  teamspaceId: string,
  nodes: GraphNode[],
  attach: AttachChildren,
): Promise<ResolvedNode[]> {
  return Promise.all(
    nodes.map(async (node) => {
      const edges = await graph.traverseEdges({
        teamspaceId,
        nodeId: node.id,
        catalogKey: attach.edgeCatalogKey,
        direction: attach.direction === "in" ? "incoming" : "outgoing",
      });
      const childIds = edges.map((edge) =>
        attach.direction === "in" ? edge.sourceNodeId : edge.targetNodeId,
      );
      const children = await Promise.all(
        childIds.map((id) => graph.getNodeById(id)),
      );
      const serializedChildren = filterByCatalogKey(
        children.filter(
          (child): child is GraphNode =>
            child !== null && canReadNodeInTeamspace(child, teamspaceId),
        ),
        attach.catalogKey,
      ).map(serialize);

      return {
        ...serialize(node),
        properties: {
          ...node.properties,
          [attach.property]: serializedChildren,
        },
      };
    }),
  );
}

async function resolveInitiativeScopedNodes(
  graph: GraphReadPort,
  teamspaceId: string,
  subjectId: string,
  catalogKey: string,
  limit?: number,
): Promise<GraphNode[]> {
  const edges = await graph.traverseEdges({
    teamspaceId,
    nodeId: subjectId,
    catalogKey: "for_initiative",
    direction: "incoming",
  });
  const scopedIds = new Set(edges.map((edge) => edge.sourceNodeId));
  const nodes = await graph.queryNodes({
    teamspaceId,
    catalogKey,
    limit: limit ?? 500,
  });
  const scoped = nodes.filter((node) => scopedIds.has(node.id));
  return limit ? scoped.slice(0, limit) : scoped;
}

async function resolveEvergreenSingleton(
  graph: GraphReadPort,
  teamspaceId: string,
  catalogKey: string,
): Promise<GraphNode | null> {
  const candidates = await graph.queryNodes({
    teamspaceId,
    catalogKey,
    limit: 100,
  });
  for (const node of candidates) {
    const scopedEdges = await graph.traverseEdges({
      teamspaceId,
      nodeId: node.id,
      direction: "outgoing",
      catalogKey: "for_initiative",
    });
    if (scopedEdges.length === 0) {
      return node;
    }
  }
  return null;
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
  teamspaceId: string,
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
          teamspaceId,
          catalogKey: def.catalogKey,
        });
        const filtered = def.filter?.length
          ? nodes.filter((n) => matchesFilter(n, def.filter as QueryFilter))
          : nodes;
        if (def.attachChildren) {
          value = await attachChildrenToNodes(
            graph,
            teamspaceId,
            filtered,
            def.attachChildren,
          );
        } else {
          value = filtered.map(serialize);
        }
        break;
      }
      case "singleton": {
        const nodes = await graph.queryNodes({
          teamspaceId,
          catalogKey: def.catalogKey,
          limit: 1,
        });
        value = nodes[0] ? serialize(nodes[0]) : null;
        break;
      }
      case "evergreen": {
        const node = await resolveEvergreenSingleton(
          graph,
          teamspaceId,
          def.catalogKey,
        );
        value = node ? serialize(node) : null;
        break;
      }
      case "initiative_scope": {
        const subject = context.subject;
        const subjectId =
          subject && typeof subject === "object" && "id" in subject
            ? String((subject as ResolvedNode).id)
            : null;
        if (!subjectId) {
          value = def.limit === 1 ? null : [];
          break;
        }
        let scoped = await resolveInitiativeScopedNodes(
          graph,
          teamspaceId,
          subjectId,
          def.catalogKey,
          def.limit,
        );
        if (def.filter?.length) {
          scoped = scoped.filter((n) => matchesFilter(n, def.filter as QueryFilter));
        }
        if (def.attachChildren) {
          const enriched = await attachChildrenToNodes(
            graph,
            teamspaceId,
            scoped,
            def.attachChildren,
          );
          value = def.limit === 1 ? (enriched[0] ?? null) : enriched;
        } else if (def.limit === 1) {
          value = scoped[0] ? serialize(scoped[0]) : null;
        } else {
          value = scoped.map(serialize);
        }
        break;
      }
      case "node": {
        const node = await graph.getNodeById(def.nodeId);
        value =
          node && canReadNodeInTeamspace(node, teamspaceId) ? serialize(node) : null;
        break;
      }
      case "subject": {
        const subject = context.subject;
        value =
          subject && typeof subject === "object" && "id" in subject
            ? (subject as ResolvedNode)
            : null;
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
          teamspaceId,
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
        const nodes = filterByCatalogKey(
          targets.filter(
            (n): n is GraphNode =>
              n !== null && canReadNodeInTeamspace(n, teamspaceId),
          ),
          def.catalogKey,
        );
        if (def.attachChildren) {
          value = await attachChildrenToNodes(
            graph,
            teamspaceId,
            nodes,
            def.attachChildren,
          );
        } else {
          value = nodes.map(serialize);
        }
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
        if (!node || !canReadNodeInTeamspace(node, teamspaceId)) {
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
      case "url_selection": {
        const searchParams = context.searchParams as
          | Record<string, string | undefined>
          | undefined;
        const rawId = searchParams?.[def.param];
        if (!rawId) {
          value = null;
          break;
        }
        const node = await graph.getNodeById(rawId);
        if (
          !node ||
          !canReadNodeInTeamspace(node, teamspaceId) ||
          node.catalogKey !== def.catalogKey
        ) {
          value = null;
          break;
        }
        value = serialize(node);
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
