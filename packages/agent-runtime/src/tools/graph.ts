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
import { getGraphPorts, getGraphReadPort } from "../ports.js";
import { getRunContext, serializeEdge, serializeNode } from "./context.js";

export function createGraphTools(): ToolSet {
  return {
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
        const { projectId } = getRunContext(experimental_context);
        const parsed = listNodesByTypeInputSchema.parse({ projectId, ...input });
        const nodes = await queryNodes(getGraphReadPort(projectId), parsed);
        return nodes.map(serializeNode);
      },
    }),

    get_node: tool({
      description: "Fetch a single node by id, including its content body.",
      inputSchema: z.object({ nodeId: z.string().uuid() }),
      execute: async (input, { experimental_context }) => {
        const { projectId } = getRunContext(experimental_context);
        const parsed = getNodeInputSchema.parse({ projectId, ...input });
        const node = await getNode(getGraphReadPort(projectId), parsed);
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
        const { projectId } = getRunContext(experimental_context);
        const parsed = traverseEdgesInputSchema.parse({ projectId, ...input });
        const edges = await traverseEdges(getGraphReadPort(projectId), parsed);
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
        const { projectId } = getRunContext(experimental_context);
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
        const node = await createNode(getGraphPorts(projectId), parsed);
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
        const { projectId } = getRunContext(experimental_context);
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
        const node = await updateNode(getGraphPorts(projectId), parsed);
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
        const { projectId } = getRunContext(experimental_context);
        const parsed = createEdgeInputSchema.parse({ projectId, ...input });
        const edge = await createEdge(getGraphPorts(projectId), parsed);
        return serializeEdge(edge);
      },
    }),
  };
}
