import { and, desc, eq, or, sql } from "drizzle-orm";
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

type NodeRow = typeof schema.nodes.$inferSelect & {
  catalogKey: string;
  catalogLabel: string;
};

type EdgeRow = typeof schema.edges.$inferSelect & {
  catalogKey: string;
  catalogLabel: string;
};

function mapNode(row: NodeRow): GraphNode {
  return {
    id: row.id,
    projectId: row.projectId,
    nodeCatalogId: row.nodeCatalogId,
    catalogKey: row.catalogKey,
    catalogLabel: row.catalogLabel,
    title: row.title,
    properties: row.properties,
    schemaVersion: row.schemaVersion,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapEdge(row: EdgeRow): GraphEdge {
  return {
    id: row.id,
    projectId: row.projectId,
    edgeCatalogId: row.edgeCatalogId,
    catalogKey: row.catalogKey,
    catalogLabel: row.catalogLabel,
    sourceNodeId: row.sourceNodeId,
    targetNodeId: row.targetNodeId,
    properties: row.properties,
    createdAt: row.createdAt,
  };
}

function nodeSelect(db: Db) {
  return db
    .select({
      id: schema.nodes.id,
      projectId: schema.nodes.projectId,
      nodeCatalogId: schema.nodes.nodeCatalogId,
      catalogKey: schema.nodeCatalog.key,
      catalogLabel: schema.nodeCatalog.label,
      title: schema.nodes.title,
      properties: schema.nodes.properties,
      schemaVersion: schema.nodes.schemaVersion,
      createdAt: schema.nodes.createdAt,
      updatedAt: schema.nodes.updatedAt,
    })
    .from(schema.nodes)
    .innerJoin(
      schema.nodeCatalog,
      eq(schema.nodes.nodeCatalogId, schema.nodeCatalog.id),
    );
}

function edgeSelect(db: Db) {
  return db
    .select({
      id: schema.edges.id,
      projectId: schema.edges.projectId,
      edgeCatalogId: schema.edges.edgeCatalogId,
      catalogKey: schema.edgeCatalog.key,
      catalogLabel: schema.edgeCatalog.label,
      sourceNodeId: schema.edges.sourceNodeId,
      targetNodeId: schema.edges.targetNodeId,
      properties: schema.edges.properties,
      createdAt: schema.edges.createdAt,
    })
    .from(schema.edges)
    .innerJoin(
      schema.edgeCatalog,
      eq(schema.edges.edgeCatalogId, schema.edgeCatalog.id),
    );
}

export function createGraphReadPort(
  db: Db,
  scope: GraphPortsScope,
): GraphReadPort {
  const { projectId } = scope;

  return {
    async queryNodes(params: ListNodesByTypeInput) {
      const conditions = [eq(schema.nodes.projectId, projectId)];
      if (params.nodeCatalogId) {
        conditions.push(eq(schema.nodes.nodeCatalogId, params.nodeCatalogId));
      }
      if (params.catalogKey) {
        conditions.push(eq(schema.nodeCatalog.key, params.catalogKey));
      }
      if (params.lifecycleStatus) {
        conditions.push(
          sql`${schema.nodes.properties}->>'lifecycleStatus' = ${params.lifecycleStatus}`,
        );
      }

      const rows = await nodeSelect(db)
        .where(and(...conditions))
        .orderBy(desc(schema.nodes.updatedAt))
        .limit(params.limit ?? 100)
        .offset(params.offset ?? 0);
      return rows.map(mapNode);
    },

    async getNode(params: GetNodeInput) {
      const rows = await nodeSelect(db)
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
      const rows = await nodeSelect(db)
        .where(eq(schema.nodes.id, nodeId))
        .limit(1);
      return rows[0] ? mapNode(rows[0]) : null;
    },

    async traverseEdges(params: TraverseEdgesInput) {
      const direction = params.direction ?? "both";
      const conditions = [eq(schema.edges.projectId, projectId)];

      if (params.edgeCatalogId) {
        conditions.push(eq(schema.edges.edgeCatalogId, params.edgeCatalogId));
      }
      if (params.catalogKey) {
        conditions.push(eq(schema.edgeCatalog.key, params.catalogKey));
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

      const rows = await edgeSelect(db)
        .where(and(...conditions))
        .orderBy(desc(schema.edges.createdAt));
      return rows.map(mapEdge);
    },
  };
}
