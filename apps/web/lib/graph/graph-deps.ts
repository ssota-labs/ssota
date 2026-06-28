import { createNode, createInitiativeBundle, updateNode, createEdge } from "@ssota/core";
import type { NodeType } from "@ssota/contracts";
import { getGraphPorts } from "@/lib/ports";

export function getGraphDeps(teamspaceId: string, accountId?: string) {
  const { catalog, graphRead, graphWrite } = getGraphPorts(teamspaceId, accountId);
  return { catalog, graphRead, graphWrite, teamspaceId, accountId };
}

/** Builder console graph scope — full project visibility (no account filter). */
export function getBuilderGraphDeps(teamspaceId: string) {
  return getGraphDeps(teamspaceId);
}

export async function queryNodesByType(teamspaceId: string, catalogKey: NodeType) {
  const { graphRead } = getBuilderGraphDeps(teamspaceId);
  return graphRead.queryNodes({ teamspaceId, catalogKey, limit: 200 });
}

export { createNode, createInitiativeBundle, updateNode, createEdge };
