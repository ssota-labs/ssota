import type { NodeType } from "@ssota/contracts";
import type { GraphNode } from "@ssota/core";
import { getGraphDeps } from "../graph-deps";

/** Nodes linked to an initiative via for_initiative (source → initiative). */
export async function queryInitiativeScopedNodes(
  teamspaceId: string,
  initiativeId: string,
  nodeType?: NodeType,
): Promise<GraphNode[]> {
  const { graphRead } = getGraphDeps(teamspaceId);
  const edges = await graphRead.traverseEdges({
    teamspaceId,
    nodeId: initiativeId,
    direction: "incoming",
    catalogKey: "for_initiative",
  });
  const scopedIds = new Set(edges.map((edge) => edge.sourceNodeId));

  const nodes = await graphRead.queryNodes({
    teamspaceId,
    catalogKey: nodeType,
    limit: 500,
  });

  return nodes.filter((node) => scopedIds.has(node.id));
}
