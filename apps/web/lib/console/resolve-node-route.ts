import type { GraphNode } from "@ssota/core";
import {
  INITIATIVE_ROUTE_METAS,
  STATIC_ROUTE_METAS,
  type RouteMeta,
} from "./route-node-map";
import { initiativePath, projectPath, type ProjectRouteContext } from "./paths";
import { getGraphDeps } from "@/lib/graph/graph-deps";
import { getEvergreenSingleton } from "@/lib/graph/loaders/get-evergreen-singleton";
import type { NodeType } from "@ssota/contracts";

function findInitiativeRouteMeta(nodeType: string): RouteMeta | null {
  for (const meta of INITIATIVE_ROUTE_METAS) {
    if (meta.nodeTypes.includes(nodeType)) {
      return meta;
    }
  }
  return null;
}

function findStaticRouteMeta(nodeType: string): RouteMeta | null {
  for (const meta of STATIC_ROUTE_METAS) {
    if (meta.nodeTypes.includes(nodeType)) {
      return meta;
    }
  }
  return null;
}

async function findInitiativeIdForNode(
  projectId: string,
  nodeId: string,
): Promise<string | null> {
  const { graphRead } = getGraphDeps(projectId);
  const edges = await graphRead.traverseEdges({
    projectId,
    nodeId,
    direction: "outgoing",
    edgeType: "for_initiative",
  });
  if (edges.length === 0) return null;
  return edges[0]!.targetNodeId;
}

/** Resolve the best console route for a graph node, or null for node-detail fallback. */
export async function resolveNodeRoute(
  ctx: ProjectRouteContext,
  projectId: string,
  node: GraphNode,
): Promise<string | null> {
  if (node.nodeType === "initiative") {
    return initiativePath(ctx, node.id);
  }

  if (node.nodeType === "release") {
    const { graphRead } = getGraphDeps(projectId);
    const paired = await graphRead.traverseEdges({
      projectId,
      nodeId: node.id,
      direction: "both",
      edgeType: "paired_with",
    });
    for (const edge of paired) {
      const otherId =
        edge.sourceNodeId === node.id ? edge.targetNodeId : edge.sourceNodeId;
      const other = await graphRead.getNode({ projectId, nodeId: otherId });
      if (other?.nodeType === "initiative") {
        return initiativePath(ctx, other.id);
      }
    }
  }

  const initiativeId = await findInitiativeIdForNode(projectId, node.id);
  if (initiativeId) {
    const initiativeMeta = findInitiativeRouteMeta(node.nodeType);
    if (initiativeMeta) {
      return initiativeMeta.path
        ? initiativePath(ctx, initiativeId, ...initiativeMeta.path.split("/"))
        : initiativePath(ctx, initiativeId);
    }
  }

  const staticMeta = findStaticRouteMeta(node.nodeType);
  if (staticMeta && staticMeta.scope === "evergreen") {
    const singleton = await getEvergreenSingleton(
      projectId,
      node.nodeType as NodeType,
    );
    if (singleton?.id === node.id) {
      return projectPath(ctx, ...staticMeta.path.split("/"));
    }
  }

  if (staticMeta && staticMeta.scope === "project") {
    return projectPath(ctx, ...staticMeta.path.split("/"));
  }

  return null;
}

export function nodeDetailPath(
  ctx: ProjectRouteContext,
  nodeId: string,
): string {
  return projectPath(ctx, "nodes", nodeId);
}
