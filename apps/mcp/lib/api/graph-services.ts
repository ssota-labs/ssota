import {
  catalogSearchInputSchema,
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
  readLifecycleStatus,
  readNodeContent,
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
    catalogKey: node.catalogKey,
    nodeCatalogId: node.nodeCatalogId,
    catalogLabel: node.catalogLabel,
    title: node.title,
    properties: node.properties,
    content: readNodeContent(node.properties),
    lifecycleStatus: readLifecycleStatus(node.properties),
    schemaVersion: node.schemaVersion,
    createdAt: node.createdAt.toISOString(),
    updatedAt: node.updatedAt.toISOString(),
  };
}

function serializeEdge(edge: GraphEdge) {
  return {
    id: edge.id,
    projectId: edge.projectId,
    catalogKey: edge.catalogKey,
    edgeCatalogId: edge.edgeCatalogId,
    catalogLabel: edge.catalogLabel,
    sourceNodeId: edge.sourceNodeId,
    targetNodeId: edge.targetNodeId,
    properties: edge.properties,
    createdAt: edge.createdAt.toISOString(),
  };
}

function normalizeNodeQueryInput(input: Record<string, unknown>) {
  const catalogKey =
    (input.catalogKey as string | undefined) ??
    (input.nodeType as string | undefined);
  const { nodeType: _nodeType, ...rest } = input;
  return catalogKey ? { ...rest, catalogKey } : rest;
}

function normalizeEdgeInput(input: Record<string, unknown>) {
  const catalogKey =
    (input.catalogKey as string | undefined) ??
    (input.edgeType as string | undefined);
  const { edgeType: _edgeType, ...rest } = input;
  return catalogKey ? { ...rest, catalogKey } : rest;
}

function mergeNodePropertiesForWrite(
  properties: Record<string, unknown> | undefined,
  extras?: {
    content?: string | null;
    lifecycleStatus?: string;
  },
): Record<string, unknown> | undefined {
  if (
    properties === undefined &&
    extras?.content === undefined &&
    extras?.lifecycleStatus === undefined
  ) {
    return undefined;
  }
  const merged = { ...(properties ?? {}) };
  if (extras?.content !== undefined) merged.content = extras.content;
  if (extras?.lifecycleStatus !== undefined) {
    merged.lifecycleStatus = extras.lifecycleStatus;
  }
  return merged;
}

export async function listNodeTypesForMcp() {
  const rows = await catalog.listNodeCatalog();
  return rows.map((entry) => {
    const meta = getNodeTypeEntry(entry.key);
    return {
      catalogKey: entry.key,
      label: entry.label,
      mutability: meta?.mutability ?? "living",
      contentRequired: meta?.contentRequired ?? false,
    };
  });
}

export function getNodeTypeForMcp(catalogKey: string) {
  const entry = getNodeTypeEntry(catalogKey);
  if (!entry) return null;
  return {
    catalogKey: entry.nodeType,
    label: entry.label,
    description: entry.description,
    keywords: entry.keywords,
    mutability: entry.mutability,
    contentRequired: entry.contentRequired,
  };
}

export function getEdgeTypeForMcp(catalogKey: string) {
  const entry = getEdgeTypeEntry(catalogKey);
  if (!entry) return null;
  return {
    catalogKey: entry.edgeType,
    label: entry.label,
    description: entry.description,
    keywords: entry.keywords,
  };
}

export function listEdgeTypesForMcp() {
  return listEdgeTypes().map((catalogKey) => {
    const entry = getEdgeTypeEntry(catalogKey);
    return {
      catalogKey,
      label: entry?.label ?? catalogKey,
    };
  });
}

/**
 * Progressive-disclosure catalog search. Hits the project-scoped DB catalog so
 * custom node/edge types created in the project are included (not just the
 * contracts SSOT). Returns lightweight hits; fetch detail with
 * get_node_type / get_edge_type.
 */
export async function searchCatalogForMcp(
  projectId: string,
  input: Record<string, unknown>,
) {
  const parsed = catalogSearchInputSchema.parse(input);
  const { catalog: projectCatalog } = getGraphPorts(projectId);
  return projectCatalog.searchCatalog(parsed);
}

export async function queryNodesForMcp(
  projectId: string,
  input: Record<string, unknown>,
) {
  const parsed = listNodesByTypeInputSchema.parse({
    projectId,
    ...normalizeNodeQueryInput(input),
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
    ...normalizeEdgeInput(input),
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
  const normalized = normalizeNodeQueryInput(input);
  const parsed = createNodeInputSchema.parse({
    projectId,
    ...normalized,
    properties: mergeNodePropertiesForWrite(
      (normalized.properties as Record<string, unknown> | undefined) ?? {},
      {
        content: normalized.content as string | null | undefined,
        lifecycleStatus: normalized.lifecycleStatus as string | undefined,
      },
    ),
  });
  const node = await createNode(graphDeps(projectId), parsed);
  return serializeNode(node);
}

export async function updateNodeForMcp(
  projectId: string,
  input: Record<string, unknown>,
) {
  const normalized = normalizeNodeQueryInput(input);
  const parsed = updateNodeInputSchema.parse({
    projectId,
    nodeId: normalized.nodeId,
    title: normalized.title,
    properties: mergeNodePropertiesForWrite(
      normalized.properties as Record<string, unknown> | undefined,
      {
        content: normalized.content as string | null | undefined,
        lifecycleStatus: normalized.lifecycleStatus as string | undefined,
      },
    ),
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
    ...normalizeEdgeInput(input),
  });
  const edge = await createEdge(graphDeps(projectId), parsed);
  return serializeEdge(edge);
}
