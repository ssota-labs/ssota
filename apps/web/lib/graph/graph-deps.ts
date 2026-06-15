import { createNode, createInitiativeBundle, updateNode } from "@ssota/core";
import type { NodeType } from "@ssota/contracts";
import { getGraphPorts } from "@/lib/ports";

export function getGraphDeps(projectId: string) {
  const { catalog, graphRead, graphWrite } = getGraphPorts(projectId);
  return { catalog, graphRead, graphWrite, projectId };
}

export async function queryNodesByType(projectId: string, nodeType: NodeType) {
  const { graphRead } = getGraphDeps(projectId);
  return graphRead.queryNodes({ projectId, nodeType, limit: 200 });
}

export { createNode, createInitiativeBundle, updateNode };
