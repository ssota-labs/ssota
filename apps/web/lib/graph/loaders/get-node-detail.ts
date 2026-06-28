import type { GraphEdge, GraphNode } from "@ssota/core";
import { getNodeTypeEntry } from "@ssota/contracts";
import { orgPath, type OrgRouteContext } from "@/lib/console/paths";
import { getGraphDeps } from "../graph-deps";

export type NodeEdgeView = {
  id: string;
  edgeType: string;
  direction: "incoming" | "outgoing";
  neighborId: string;
  neighborTitle: string;
  neighborNodeType: string;
};

export type NodeDetailView = {
  node: GraphNode;
  typeLabel: string;
  mutability: "living" | "versioned" | "immutable";
  canonicalRoute: string | null;
  detailPath: string;
  incomingEdges: NodeEdgeView[];
  outgoingEdges: NodeEdgeView[];
};

async function mapEdges(
  edges: GraphEdge[],
  direction: "incoming" | "outgoing",
  teamspaceId: string,
): Promise<NodeEdgeView[]> {
  const { graphRead } = await getGraphDeps(teamspaceId);
  const views: NodeEdgeView[] = [];

  for (const edge of edges) {
    const neighborId =
      direction === "incoming" ? edge.sourceNodeId : edge.targetNodeId;
    const neighbor = await graphRead.getNode({ teamspaceId, nodeId: neighborId });
    views.push({
      id: edge.id,
      edgeType: edge.catalogKey,
      direction,
      neighborId,
      neighborTitle: neighbor?.title || "Untitled",
      neighborNodeType: neighbor?.catalogKey ?? "unknown",
    });
  }

  return views;
}

export async function getNodeDetailView(
  ctx: OrgRouteContext,
  teamspaceId: string,
  nodeId: string,
): Promise<NodeDetailView | null> {
  const { graphRead } = await getGraphDeps(teamspaceId);
  const node = await graphRead.getNode({ teamspaceId, nodeId });
  if (!node) return null;

  const [incoming, outgoing] = await Promise.all([
    graphRead.traverseEdges({
      teamspaceId,
      nodeId,
      direction: "incoming",
    }),
    graphRead.traverseEdges({
      teamspaceId,
      nodeId,
      direction: "outgoing",
    }),
  ]);

  const entry = getNodeTypeEntry(node.catalogKey);

  // All nodes are addressed by the unified node route `/n/[id]` (template-or-
  // generic detail). Replaces the per-type resolveNodeRoute switch.
  const nodePath = orgPath(ctx, "n", node.id);
  return {
    node,
    typeLabel: entry?.label ?? node.catalogKey,
    mutability: entry?.mutability ?? "living",
    canonicalRoute: nodePath,
    detailPath: nodePath,
    incomingEdges: await mapEdges(incoming, "incoming", teamspaceId),
    outgoingEdges: await mapEdges(outgoing, "outgoing", teamspaceId),
  };
}
