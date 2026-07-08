import {
  catalogSearchInputSchema,
  getNodeTypeEntry,
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
import { getCatalogWritePort, getGraphPorts } from "@/lib/ports";

function serializeNode(node: GraphNode) {
  return {
    id: node.id,
    teamspaceId: node.teamspaceId,
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
    teamspaceId: edge.teamspaceId,
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

export async function listNodeTypesForMcp(teamspaceId: string) {
  const { catalog } = getGraphPorts(teamspaceId);
  const rows = await catalog.listNodeCatalog();
  return rows.map((entry) => {
    const meta = getNodeTypeEntry(entry.key);
    return {
      // Identifier is exposed as both `catalogKey` (matches create_node /
      // get_node_type params) and `key` (matches create_node_type /
      // search_catalog output) so either projection works.
      catalogKey: entry.key,
      key: entry.key,
      label: entry.label,
      description: entry.description,
      mutability: meta?.mutability ?? "living",
      contentRequired: meta?.contentRequired ?? false,
    };
  });
}

export async function getNodeTypeForMcp(
  teamspaceId: string,
  catalogKey: string,
) {
  const { catalog } = getGraphPorts(teamspaceId);
  const row = await catalog.getNodeCatalogByKey(catalogKey);
  if (!row) return null;
  const meta = getNodeTypeEntry(catalogKey);
  return {
    catalogKey: row.key,
    key: row.key,
    label: row.label,
    description: row.description,
    keywords: row.keywords,
    propertySchema: row.propertySchema,
    mutability: meta?.mutability ?? "living",
    contentRequired: meta?.contentRequired ?? false,
  };
}

export async function getEdgeTypeForMcp(
  teamspaceId: string,
  catalogKey: string,
) {
  const { catalog } = getGraphPorts(teamspaceId);
  const row = await catalog.getEdgeCatalogByKey(catalogKey);
  if (!row) return null;
  // Resolve domain/range catalog ids back to node-type KEYS so authors can
  // verify edge wiring without a separate id->key lookup.
  const idsToKeys = async (ids: string[]): Promise<string[]> => {
    const keys: string[] = [];
    for (const id of ids) {
      const node = await catalog.getNodeCatalogById(id);
      if (node) keys.push(node.key);
    }
    return keys;
  };
  return {
    catalogKey: row.key,
    key: row.key,
    label: row.label,
    description: row.description,
    keywords: row.keywords,
    domainKeys: await idsToKeys(row.domainCatalogIds),
    rangeKeys: await idsToKeys(row.rangeCatalogIds),
    domainCatalogIds: row.domainCatalogIds,
    rangeCatalogIds: row.rangeCatalogIds,
  };
}

export async function listEdgeTypesForMcp(teamspaceId: string) {
  const { catalog } = getGraphPorts(teamspaceId);
  const rows = await catalog.listEdgeCatalog();
  return rows.map((entry) => ({
    catalogKey: entry.key,
    key: entry.key,
    label: entry.label,
  }));
}

/**
 * S1 — Catalog write (node type). Mirrors agent-runtime `create_node_type`:
 * upserts an org-scoped node_catalog row so the domain's entities can be
 * modeled before creating node instances. Upserts by (org, key).
 */
export async function createNodeTypeForMcp(
  teamspaceId: string,
  input: Record<string, unknown>,
) {
  const writePort = getCatalogWritePort(teamspaceId);
  const row = await writePort.upsertNodeCatalog({
    key: String(input.key),
    label: String(input.label),
    description: input.description as string | undefined,
    keywords: input.keywords as string[] | undefined,
    propertySchema: (input.propertySchema as Record<string, unknown>) ?? {},
  });
  return { ...row, catalogKey: row.key };
}

/**
 * S1 — Catalog write (edge type). Resolves domain/range node-type KEYS to
 * catalog ids (throws if a key is unknown → author it with create_node_type
 * first), then upserts an org-scoped edge_catalog row. Upserts by (org, key).
 */
export async function createEdgeTypeForMcp(
  teamspaceId: string,
  input: Record<string, unknown>,
) {
  const { catalog } = getGraphPorts(teamspaceId);
  const resolveKeys = async (keys: string[]): Promise<string[]> => {
    const ids: string[] = [];
    for (const key of keys) {
      const nodeType = await catalog.getNodeCatalogByKey(key);
      if (!nodeType) {
        throw new Error(
          `Unknown node type key '${key}' — create it with create_node_type first.`,
        );
      }
      ids.push(nodeType.id);
    }
    return ids;
  };
  const domainKeys = (input.domainKeys as string[] | undefined) ?? [];
  const rangeKeys = (input.rangeKeys as string[] | undefined) ?? [];
  const writePort = getCatalogWritePort(teamspaceId);
  const row = await writePort.upsertEdgeCatalog({
    key: String(input.key),
    label: String(input.label),
    description: input.description as string | undefined,
    keywords: input.keywords as string[] | undefined,
    domainCatalogIds: await resolveKeys(domainKeys),
    rangeCatalogIds: await resolveKeys(rangeKeys),
    propertySchema:
      (input.propertySchema as Record<string, unknown> | null | undefined) ??
      null,
  });
  // Echo the resolved domain/range back as keys so authors can verify the
  // mapping without a second lookup.
  return { ...row, catalogKey: row.key, domainKeys, rangeKeys };
}

/**
 * Progressive-disclosure catalog search. Hits the project-scoped DB catalog so
 * custom node/edge types created in the project are included (not just the
 * contracts SSOT). Returns lightweight hits; fetch detail with
 * get_node_type / get_edge_type.
 */
export async function searchCatalogForMcp(
  teamspaceId: string,
  input: Record<string, unknown>,
) {
  const parsed = catalogSearchInputSchema.parse(input);
  const { catalog: projectCatalog } = getGraphPorts(teamspaceId);
  return projectCatalog.searchCatalog(parsed);
}

export async function queryNodesForMcp(
  teamspaceId: string,
  input: Record<string, unknown>,
) {
  const parsed = listNodesByTypeInputSchema.parse({
    teamspaceId,
    ...normalizeNodeQueryInput(input),
  });
  const { graphRead } = getGraphPorts(teamspaceId);
  const nodes = await queryNodes(graphRead, parsed);
  return nodes.map(serializeNode);
}

export async function getNodeForMcp(
  teamspaceId: string,
  input: Record<string, unknown>,
) {
  const parsed = getNodeInputSchema.parse({
    teamspaceId,
    ...input,
  });
  const { graphRead } = getGraphPorts(teamspaceId);
  const node = await getNode(graphRead, parsed);
  return node ? serializeNode(node) : null;
}

export async function traverseEdgesForMcp(
  teamspaceId: string,
  input: Record<string, unknown>,
) {
  const parsed = traverseEdgesInputSchema.parse({
    teamspaceId,
    ...normalizeEdgeInput(input),
  });
  const { graphRead } = getGraphPorts(teamspaceId);
  const edges = await traverseEdges(graphRead, parsed);
  return edges.map(serializeEdge);
}

function graphDeps(teamspaceId: string) {
  return getGraphPorts(teamspaceId);
}

export async function createNodeForMcp(
  teamspaceId: string,
  input: Record<string, unknown>,
) {
  const normalized = normalizeNodeQueryInput(input);
  const parsed = createNodeInputSchema.parse({
    teamspaceId,
    ...normalized,
    properties: mergeNodePropertiesForWrite(
      (normalized.properties as Record<string, unknown> | undefined) ?? {},
      {
        content: normalized.content as string | null | undefined,
        lifecycleStatus: normalized.lifecycleStatus as string | undefined,
      },
    ),
  });
  const node = await createNode(graphDeps(teamspaceId), parsed);
  return serializeNode(node);
}

export async function updateNodeForMcp(
  teamspaceId: string,
  input: Record<string, unknown>,
) {
  const normalized = normalizeNodeQueryInput(input);
  const parsed = updateNodeInputSchema.parse({
    teamspaceId,
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
  const node = await updateNode(graphDeps(teamspaceId), parsed);
  return serializeNode(node);
}

export async function createEdgeForMcp(
  teamspaceId: string,
  input: Record<string, unknown>,
) {
  const parsed = createEdgeInputSchema.parse({
    teamspaceId,
    ...normalizeEdgeInput(input),
  });
  const edge = await createEdge(graphDeps(teamspaceId), parsed);
  return serializeEdge(edge);
}
