import {
  getEdgeTypeEntry,
  getNodeTypeEntry,
  listEdgeTypes,
} from "@ssota/contracts";
import {
  createEdgeInputSchema,
  createNodeInputSchema,
  getNodeInputSchema,
  listNodesByTypeInputSchema,
  traverseEdgesInputSchema,
  updateNodeInputSchema,
} from "@ssota/contracts/graph";
import type { GraphEdge, GraphNode } from "@ssota/core";
import {
  createEdge,
  createNode,
  getNode,
  queryNodes,
  traverseEdges,
  updateNode,
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

function graphDeps(projectId: string) {
  return getGraphPorts(projectId);
}

export async function createNodeForMcp(
  projectId: string,
  input: Record<string, unknown>,
) {
  const parsed = createNodeInputSchema.parse({
    projectId,
    ...input,
  });
  const node = await createNode(graphDeps(projectId), parsed);
  return serializeNode(node);
}

export async function updateNodeForMcp(
  projectId: string,
  input: Record<string, unknown>,
) {
  const parsed = updateNodeInputSchema.parse({
    projectId,
    ...input,
  });
  const node = await updateNode(graphDeps(projectId), parsed);
  return serializeNode(node);
}

export async function createEdgeForMcp(
  projectId: string,
  input: Record<string, unknown>,
) {
  const parsed = createEdgeInputSchema.parse({
    projectId,
    ...input,
  });
  const { graphRead, graphWrite } = graphDeps(projectId);
  const edge = await createEdge({ graphRead, graphWrite }, parsed);
  return serializeEdge(edge);
}
