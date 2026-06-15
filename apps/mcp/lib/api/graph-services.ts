import {
  getEdgeTypeEntry,
  getNodeTypeEntry,
  listEdgeTypes,
} from "@ssota/contracts";
import {
  getNodeInputSchema,
  listNodesByTypeInputSchema,
  traverseEdgesInputSchema,
} from "@ssota/contracts/graph";
import type { GraphEdge, GraphNode } from "@ssota/core";
import {
  getNode,
  queryNodes,
  traverseEdges,
} from "@ssota/core";
import { createContractsCatalogReadPort } from "@ssota/core";
import { getGraphPorts } from "@/lib/ports";

const catalog = createContractsCatalogReadPort();

function serializeNode(node: GraphNode) {
  return {
    id: node.id,
    projectId: node.projectId,
    nodeType: node.nodeType,
    title: node.title,
    properties: node.properties,
    content: node.content,
    lifecycleStatus: node.lifecycleStatus,
    schemaVersion: node.schemaVersion,
    createdAt: node.createdAt.toISOString(),
    updatedAt: node.updatedAt.toISOString(),
  };
}

function serializeEdge(edge: GraphEdge) {
  return {
    id: edge.id,
    projectId: edge.projectId,
    edgeType: edge.edgeType,
    sourceNodeId: edge.sourceNodeId,
    targetNodeId: edge.targetNodeId,
    properties: edge.properties,
    createdAt: edge.createdAt.toISOString(),
  };
}

export function listNodeTypesForMcp() {
  return catalog.listNodeTypes().map((entry) => ({
    nodeType: entry.nodeType,
    label: entry.label,
    mutability: entry.mutability,
    contentRequired: entry.contentRequired,
  }));
}

export function getNodeTypeForMcp(nodeType: string) {
  const entry = getNodeTypeEntry(nodeType);
  if (!entry) return null;
  return {
    nodeType: entry.nodeType,
    label: entry.label,
    mutability: entry.mutability,
    contentRequired: entry.contentRequired,
  };
}

export function listEdgeTypesForMcp() {
  return listEdgeTypes().map((edgeType) => {
    const entry = getEdgeTypeEntry(edgeType);
    return {
      edgeType,
      label: entry?.label ?? edgeType,
    };
  });
}

export async function queryNodesForMcp(
  projectId: string,
  input: Record<string, unknown>,
) {
  const parsed = listNodesByTypeInputSchema.parse({
    projectId,
    ...input,
  });
  const { graphRead } = getGraphPorts(projectId);
  const nodes = await queryNodes(graphRead, parsed);
  return nodes.map(serializeNode);
}

export async function getNodeForMcp(
  projectId: string,
  input: Record<string, unknown>,
) {
  const parsed = getNodeInputSchema.parse({
    projectId,
    ...input,
  });
  const { graphRead } = getGraphPorts(projectId);
  const node = await getNode(graphRead, parsed);
  return node ? serializeNode(node) : null;
}

export async function traverseEdgesForMcp(
  projectId: string,
  input: Record<string, unknown>,
) {
  const parsed = traverseEdgesInputSchema.parse({
    projectId,
    ...input,
  });
  const { graphRead } = getGraphPorts(projectId);
  const edges = await traverseEdges(graphRead, parsed);
  return edges.map(serializeEdge);
}
