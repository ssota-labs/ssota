import { createNode, createInitiativeBundle, updateNode, createEdge } from "@ssota/core";
import type { NodeType } from "@ssota/contracts";
import { getGraphPorts } from "@/lib/ports";

export function getGraphDeps(projectId: string, accountId?: string) {
  const { catalog, graphRead, graphWrite } = getGraphPorts(projectId, accountId);
  return { catalog, graphRead, graphWrite, projectId, accountId };
}

/** Builder console graph scope — full project visibility (no account filter). */
export function getBuilderGraphDeps(projectId: string) {
  return getGraphDeps(projectId);
}

export async function queryNodesByType(projectId: string, catalogKey: NodeType) {
  const { graphRead } = getBuilderGraphDeps(projectId);
  return graphRead.queryNodes({ projectId, catalogKey, limit: 200 });
}

export { createNode, createInitiativeBundle, updateNode, createEdge };
