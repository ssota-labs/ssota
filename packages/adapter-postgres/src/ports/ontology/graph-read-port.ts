import { and, desc, eq, isNull, or, sql, type SQL } from "drizzle-orm";
import type {
  GetNodeInput,
  ListEdgesInput,
  ListNodesByTypeInput,
  TraverseEdgesInput,
} from "@ssota/contracts/graph";
import type { GraphEdge, GraphNode, GraphReadPort } from "@ssota/core";
import type { Db } from "../../db/client.js";
import * as schema from "../../db/schema.js";

export interface GraphPortsScope {
  organizationId: string;
  teamspaceId: string;
  /**
   * End-user data partition (Phase 5). When set, reads see shared
   * (account_id IS NULL) + own rows, and writes are tagged with it. When
   * undefined (builder/admin scope), all rows are visible.
   */
  accountId?: string;
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
    teamspaceId: row.teamspaceId,
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
    teamspaceId: row.teamspaceId,
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
      teamspaceId: schema.nodes.teamspaceId,
      accountId: schema.nodes.accountId,
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
      teamspaceId: schema.edges.teamspaceId,
      accountId: schema.edges.accountId,
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
  const { organizationId: _organizationId, teamspaceId, accountId } = scope;

  /** Teamspace-scoped reads include org-shared rows (teamspace_id IS NULL). */
  const teamspaceScopeCond = () =>
    or(
      eq(schema.nodes.teamspaceId, teamspaceId),
      isNull(schema.nodes.teamspaceId),
    )!;
  const edgeTeamspaceScopeCond = () =>
    or(
      eq(schema.edges.teamspaceId, teamspaceId),
      isNull(schema.edges.teamspaceId),
    )!;

  const nodeAccountConds = (): SQL[] =>
    accountId
      ? [
          or(
            isNull(schema.nodes.accountId),
            eq(schema.nodes.accountId, accountId),
          )!,
        ]
      : [];
  const edgeAccountConds = (): SQL[] =>
    accountId
      ? [
          or(
            isNull(schema.edges.accountId),
            eq(schema.edges.accountId, accountId),
          )!,
        ]
      : [];

  return {
    async queryNodes(params: ListNodesByTypeInput) {
      const conditions = [teamspaceScopeCond(), ...nodeAccountConds()];
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

    async queryEdges(params: ListEdgesInput) {
      const conditions = [edgeTeamspaceScopeCond(), ...edgeAccountConds()];
      if (params.edgeCatalogId) {
        conditions.push(eq(schema.edges.edgeCatalogId, params.edgeCatalogId));
      }
      if (params.catalogKey) {
        conditions.push(eq(schema.edgeCatalog.key, params.catalogKey));
      }

      const rows = await edgeSelect(db)
        .where(and(...conditions))
        .orderBy(desc(schema.edges.createdAt))
        .limit(params.limit ?? 100)
        .offset(params.offset ?? 0);
      return rows.map(mapEdge);
    },

    async getNode(params: GetNodeInput) {
      const rows = await nodeSelect(db)
        .where(
          and(
            teamspaceScopeCond(),
            eq(schema.nodes.id, params.nodeId),
            ...nodeAccountConds(),
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
      const conditions = [edgeTeamspaceScopeCond(), ...edgeAccountConds()];

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
