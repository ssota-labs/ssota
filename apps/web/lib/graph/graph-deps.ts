import {
  createNode,
  createInitiativeBundle,
  updateNode,
  createEdge,
  createGraphGatePolicySource,
} from "@ssota/core";
import type { NodeType } from "@ssota/contracts";
import { getGraphPorts, getTaskPort, getAgentDefinitionPort } from "@/lib/ports";

export async function getGraphDeps(teamspaceId: string, accountId?: string) {
  const { catalog, graphRead, graphWrite } = await getGraphPorts(
    teamspaceId,
    accountId,
  );
  const gatePolicies = createGraphGatePolicySource(graphRead);
  const spawn = {
    tasks: getTaskPort(teamspaceId, accountId),
    graphRead,
    agentDefinitions: getAgentDefinitionPort(teamspaceId),
    gatePolicies,
  };
  return {
    catalog,
    graphRead,
    graphWrite,
    gatePolicies,
    spawn,
    teamspaceId,
    accountId,
  };
}

/** Builder console graph scope — full project visibility (no account filter). */
export async function getBuilderGraphDeps(teamspaceId: string) {
  return getGraphDeps(teamspaceId);
}

export async function queryNodesByType(teamspaceId: string, catalogKey: NodeType) {
  const { graphRead } = await getBuilderGraphDeps(teamspaceId);
  return graphRead.queryNodes({ teamspaceId, catalogKey, limit: 200 });
}

export { createNode, createInitiativeBundle, updateNode, createEdge };
