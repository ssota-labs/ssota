import { and, desc, eq, or } from "drizzle-orm";
import type {
  GetNodeInput,
  ListNodesByTypeInput,
  TraverseEdgesInput,
} from "@ssota/contracts/graph";
import type { GraphEdge, GraphNode, GraphReadPort } from "@ssota/core";
import type { Db } from "../db/client.js";
import * as schema from "../db/schema.js";

export interface GraphPortsScope {
  projectId: string;
}

function mapNode(row: typeof schema.nodes.$inferSelect): GraphNode {
  return {
    id: row.id,
    projectId: row.projectId,
    nodeType: row.nodeType,
    title: row.title,
    properties: row.properties,
    content: row.content,
    lifecycleStatus: row.lifecycleStatus,
    schemaVersion: row.schemaVersion,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapEdge(row: typeof schema.edges.$inferSelect): GraphEdge {
  return {
    id: row.id,
    projectId: row.projectId,
    edgeType: row.edgeType,
    sourceNodeId: row.sourceNodeId,
    targetNodeId: row.targetNodeId,
    properties: row.properties,
    createdAt: row.createdAt,
  };
}

export function createGraphReadPort(
  db: Db,
  scope: GraphPortsScope,
): GraphReadPort {
  const { projectId } = scope;

  return {
    async queryNodes(params: ListNodesByTypeInput) {
      const conditions = [eq(schema.nodes.projectId, projectId)];
      if (params.nodeType) {
        conditions.push(eq(schema.nodes.nodeType, params.nodeType));
      }
      if (params.lifecycleStatus) {
        conditions.push(eq(schema.nodes.lifecycleStatus, params.lifecycleStatus));
      }

      const rows = await db
        .select()
        .from(schema.nodes)
        .where(and(...conditions))
        .orderBy(desc(schema.nodes.updatedAt))
        .limit(params.limit ?? 100)
        .offset(params.offset ?? 0);
      return rows.map(mapNode);
    },

    async getNode(params: GetNodeInput) {
      const rows = await db
        .select()
        .from(schema.nodes)
        .where(
          and(
            eq(schema.nodes.projectId, projectId),
            eq(schema.nodes.id, params.nodeId),
          ),
        )
        .limit(1);
      return rows[0] ? mapNode(rows[0]) : null;
    },

    async getNodeById(nodeId: string) {
      const rows = await db
        .select()
        .from(schema.nodes)
        .where(eq(schema.nodes.id, nodeId))
        .limit(1);
      return rows[0] ? mapNode(rows[0]) : null;
    },

    async traverseEdges(params: TraverseEdgesInput) {
      const direction = params.direction ?? "both";
      const conditions = [eq(schema.edges.projectId, projectId)];

      if (params.edgeType) {
        conditions.push(eq(schema.edges.edgeType, params.edgeType));
      }

      if (direction === "outgoing") {
        conditions.push(eq(schema.edges.sourceNodeId, params.nodeId));
      } else if (direction === "incoming") {
        conditions.push(eq(schema.edges.targetNodeId, params.nodeId));
      } else {
        conditions.push(
          or(
            eq(schema.edges.sourceNodeId, params.nodeId),
            eq(schema.edges.targetNodeId, params.nodeId),
          )!,
        );
      }

      const rows = await db
        .select()
        .from(schema.edges)
        .where(and(...conditions))
        .orderBy(desc(schema.edges.createdAt));
      return rows.map(mapEdge);
    },
  };
}
