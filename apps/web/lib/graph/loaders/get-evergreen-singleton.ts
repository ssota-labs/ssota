import type { NodeType } from "@ssota/contracts";
import type { GraphNode } from "@ssota/core";
import { getGraphDeps } from "../graph-deps";

/** Returns the project evergreen node for a type (no outgoing for_initiative edge). */
export async function getEvergreenSingleton(
  teamspaceId: string,
  nodeType: NodeType,
): Promise<GraphNode | null> {
  const { graphRead } = await getGraphDeps(teamspaceId);
  const candidates = await graphRead.queryNodes({ teamspaceId, catalogKey: nodeType, limit: 100 });

  for (const node of candidates) {
    const scopedEdges = await graphRead.traverseEdges({
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
