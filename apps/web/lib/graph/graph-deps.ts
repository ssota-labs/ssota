import { createNode, createInitiativeBundle, updateNode, createEdge } from "@ssota/core";
import type { NodeType } from "@ssota/contracts";
import { getGraphPorts } from "@/lib/ports";

export function getGraphDeps(projectId: string) {
  const { catalog, graphRead, graphWrite } = getGraphPorts(projectId);
  return { catalog, graphRead, graphWrite, projectId };
}

export async function queryNodesByType(projectId: string, catalogKey: NodeType) {
  const { graphRead } = getGraphDeps(projectId);
  return graphRead.queryNodes({ projectId, catalogKey, limit: 200 });
}

export { createNode, createInitiativeBundle, updateNode, createEdge };
