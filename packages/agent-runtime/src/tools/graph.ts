import { tool, type ToolSet } from "ai";
import { z } from "zod";
import {
  createEdge,
  createNode,
  getNode,
  queryNodes,
  traverseEdges,
  updateNode,
} from "@ssota/core";
import {
  createEdgeInputSchema,
  createNodeInputSchema,
  getNodeInputSchema,
  listNodesByTypeInputSchema,
  traverseEdgesInputSchema,
  updateNodeInputSchema,
} from "@ssota/contracts/graph";
import { catalogSearchInputSchema } from "@ssota/contracts";
import {
  getGraphPorts,
  getGraphReadPort,
  getCatalogWritePort,
} from "../ports.js";
import { getRunContext, serializeEdge, serializeNode } from "./context.js";

export function createGraphTools(): ToolSet {
  return {
    list_node_types: tool({
      description:
        "List the project's node type catalog (the kinds of records that exist). Check this before creating nodes or defining new types.",
      inputSchema: z.object({}),
      execute: async (_input, { experimental_context }) => {
        const { projectId, accountId } = getRunContext(experimental_context);
        return getGraphPorts(projectId, accountId).catalog.listNodeCatalog();
      },
    }),

    list_edge_types: tool({
      description: "List the project's edge type catalog (the kinds of relationships).",
      inputSchema: z.object({}),
      execute: async (_input, { experimental_context }) => {
        const { projectId, accountId } = getRunContext(experimental_context);
        return getGraphPorts(projectId, accountId).catalog.listEdgeCatalog();
      },
    }),

    search_catalog: tool({
      description:
        "Search the project's type catalog (node + edge types) by keyword. Returns lightweight hits {kind,key,label,snippet,score}; fetch full detail with get_node_type / get_edge_type. Prefer this over list_node_types when the catalog is large or you only need types matching an intent (e.g. 'billing', '회고', 'metric').",
      inputSchema: z.object({
        query: z.string().min(1).describe("Search text — matches key, label, keywords, description."),
        kind: z
          .enum(["node", "edge"])
          .optional()
          .describe("Restrict to node types or edge types. Omit to search both."),
        limit: z.number().int().positive().max(50).optional(),
      }),
      execute: async (input, { experimental_context }) => {
        const { projectId, accountId } = getRunContext(experimental_context);
        const parsed = catalogSearchInputSchema.parse(input);
        return getGraphPorts(projectId, accountId).catalog.searchCatalog(parsed);
      },
    }),

    get_node_type: tool({
      description:
        "Fetch one node type's full detail (label, description, keywords, property schema) by key. Use after search_catalog / list_node_types to read the property schema before creating nodes.",
      inputSchema: z.object({ key: z.string() }),
      execute: async (input, { experimental_context }) => {
        const { projectId, accountId } = getRunContext(experimental_context);
        return getGraphPorts(projectId, accountId).catalog.getNodeCatalogByKey(
          input.key,
        );
      },
    }),

    get_edge_type: tool({
      description:
        "Fetch one edge type's full detail (label, description, keywords, domain/range constraints) by key.",
      inputSchema: z.object({ key: z.string() }),
      execute: async (input, { experimental_context }) => {
        const { projectId, accountId } = getRunContext(experimental_context);
        return getGraphPorts(projectId, accountId).catalog.getEdgeCatalogByKey(
          input.key,
        );
      },
    }),

    create_node_type: tool({
      description:
        "Define (or update) a node type in the project catalog. Use during setup to model the domain's records before creating node instances. propertySchema is a JSON-schema-like object describing the type's properties. Upserts by key.",
      inputSchema: z.object({
        key: z
          .string()
          .describe("Stable type key, e.g. 'customer', 'invoice', 'patient'."),
        label: z.string().describe("Human-readable name."),
        description: z
          .string()
          .optional()
          .describe("One-line, search-facing description of when to use this type."),
        keywords: z
          .array(z.string())
          .optional()
          .describe("Search aliases/synonyms to improve catalog search recall."),
        propertySchema: z.record(z.unknown()).optional(),
      }),
      execute: async (input, { experimental_context }) => {
        const { projectId } = getRunContext(experimental_context);
        return getCatalogWritePort(projectId).upsertNodeCatalog({
          key: input.key,
          label: input.label,
          description: input.description,
          keywords: input.keywords,
          propertySchema: input.propertySchema ?? {},
        });
      },
    }),

    create_edge_type: tool({
      description:
        "Define (or update) an edge type in the project catalog. domainKeys/rangeKeys are node-type keys that constrain valid source/target types (empty = unconstrained). Upserts by key.",
      inputSchema: z.object({
        key: z.string().describe("Stable type key, e.g. 'placed_by', 'belongs_to'."),
        label: z.string(),
        description: z
          .string()
          .optional()
          .describe("One-line, search-facing description of the relationship."),
        keywords: z
          .array(z.string())
          .optional()
          .describe("Search aliases/synonyms to improve catalog search recall."),
        domainKeys: z
          .array(z.string())
          .optional()
          .describe("Allowed source node-type keys."),
        rangeKeys: z
          .array(z.string())
          .optional()
          .describe("Allowed target node-type keys."),
        propertySchema: z.record(z.unknown()).optional(),
      }),
      execute: async (input, { experimental_context }) => {
        const { projectId, accountId } = getRunContext(experimental_context);
        const catalog = getGraphPorts(projectId, accountId).catalog;
        const resolveKeys = async (keys?: string[]) => {
          const ids: string[] = [];
          for (const key of keys ?? []) {
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
        return getCatalogWritePort(projectId).upsertEdgeCatalog({
          key: input.key,
          label: input.label,
          description: input.description,
          keywords: input.keywords,
          domainCatalogIds: await resolveKeys(input.domainKeys),
          rangeCatalogIds: await resolveKeys(input.rangeKeys),
          propertySchema: input.propertySchema ?? null,
        });
      },
    }),

    query_nodes: tool({
      description:
        "List nodes of a catalog type in the current project. Use to read planning context (objectives, prds, features, tasks, pages…).",
      inputSchema: z.object({
        catalogKey: z
          .string()
          .describe("Node catalog key, e.g. 'feature', 'prd', 'objective'."),
        limit: z.number().int().positive().max(100).optional(),
      }),
      execute: async (input, { experimental_context }) => {
        const { projectId, accountId } = getRunContext(experimental_context);
        const parsed = listNodesByTypeInputSchema.parse({ projectId, ...input });
        const nodes = await queryNodes(getGraphReadPort(projectId, accountId), parsed);
        return nodes.map(serializeNode);
      },
    }),

    get_node: tool({
      description: "Fetch a single node by id, including its content body.",
      inputSchema: z.object({ nodeId: z.string().uuid() }),
      execute: async (input, { experimental_context }) => {
        const { projectId, accountId } = getRunContext(experimental_context);
        const parsed = getNodeInputSchema.parse({ projectId, ...input });
        const node = await getNode(getGraphReadPort(projectId, accountId), parsed);
        return node ? serializeNode(node) : null;
      },
    }),

    traverse_edges: tool({
      description:
        "Traverse edges from a node to discover related nodes (e.g. a feature's PRD or stories).",
      inputSchema: z.object({
        nodeId: z.string().uuid(),
        direction: z.enum(["out", "in", "both"]).optional(),
        edgeType: z.string().optional(),
      }),
      execute: async (input, { experimental_context }) => {
        const { projectId, accountId } = getRunContext(experimental_context);
        const parsed = traverseEdgesInputSchema.parse({ projectId, ...input });
        const edges = await traverseEdges(getGraphReadPort(projectId, accountId), parsed);
        return edges.map(serializeEdge);
      },
    }),

    create_node: tool({
      description:
        "Create a new node of a catalog type. Properties are validated against the type's schema.",
      inputSchema: z.object({
        catalogKey: z.string(),
        title: z.string(),
        properties: z.record(z.unknown()).optional(),
        content: z.string().optional(),
      }),
      execute: async (input, { experimental_context }) => {
        const { projectId, accountId } = getRunContext(experimental_context);
        const properties = {
          ...(input.properties ?? {}),
          ...(input.content !== undefined ? { content: input.content } : {}),
        };
        const parsed = createNodeInputSchema.parse({
          projectId,
          catalogKey: input.catalogKey,
          title: input.title,
          properties,
        });
        const node = await createNode(getGraphPorts(projectId, accountId), parsed);
        return serializeNode(node);
      },
    }),

    update_node: tool({
      description: "Update a node's title, properties, or content body.",
      inputSchema: z.object({
        nodeId: z.string().uuid(),
        title: z.string().optional(),
        properties: z.record(z.unknown()).optional(),
        content: z.string().optional(),
      }),
      execute: async (input, { experimental_context }) => {
        const { projectId, accountId } = getRunContext(experimental_context);
        const properties =
          input.properties !== undefined || input.content !== undefined
            ? {
                ...(input.properties ?? {}),
                ...(input.content !== undefined
                  ? { content: input.content }
                  : {}),
              }
            : undefined;
        const parsed = updateNodeInputSchema.parse({
          projectId,
          nodeId: input.nodeId,
          title: input.title,
          properties,
        });
        const node = await updateNode(getGraphPorts(projectId, accountId), parsed);
        return serializeNode(node);
      },
    }),

    create_edge: tool({
      description: "Connect two nodes with a typed edge.",
      inputSchema: z.object({
        catalogKey: z.string(),
        sourceNodeId: z.string().uuid(),
        targetNodeId: z.string().uuid(),
        properties: z.record(z.unknown()).optional(),
      }),
      execute: async (input, { experimental_context }) => {
        const { projectId, accountId } = getRunContext(experimental_context);
        const parsed = createEdgeInputSchema.parse({ projectId, ...input });
        const edge = await createEdge(getGraphPorts(projectId, accountId), parsed);
        return serializeEdge(edge);
      },
    }),
  };
}
