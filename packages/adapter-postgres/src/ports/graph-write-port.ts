import { and, eq, or } from "drizzle-orm";
import type {
  CreateInitiativeBundleInput,
  DeleteEdgeInput,
  DeleteNodeInput,
  UpdateNodeInput,
} from "@ssota/contracts/graph";
import {
  GraphError,
  type CreateInitiativeBundleResult,
  type GraphWritePort,
  type ResolvedCreateEdgeInput,
  type ResolvedCreateNodeInput,
} from "@ssota/core";
import type { Db } from "../db/client.js";
import * as schema from "../db/schema.js";
import type { GraphPortsScope } from "./graph-read-port.js";

export type { ResolvedCreateNodeInput, ResolvedCreateEdgeInput };

function assertEndUserWritableRow(
  accountId: string | undefined,
  rowAccountId: string | null,
  label: string,
) {
  if (!accountId) return;
  if (rowAccountId === null) {
    throw new GraphError(
      "FORBIDDEN",
      `Cannot modify shared builder ${label} from end-user scope`,
    );
  }
  if (rowAccountId !== accountId) {
    throw new GraphError(
      "FORBIDDEN",
      `${label} belongs to a different account partition`,
    );
  }
}

async function resolveTeamspaceOrg(
  db: Db,
  teamspaceId: string | null,
  scopeOrganizationId: string,
): Promise<string | null> {
  if (teamspaceId === null) return scopeOrganizationId;
  const [row] = await db
    .select({ organizationId: schema.teamspaces.organizationId })
    .from(schema.teamspaces)
    .where(eq(schema.teamspaces.id, teamspaceId))
    .limit(1);
  return row?.organizationId ?? null;
}

async function assertEndpointsSameOrg(
  db: Db,
  organizationId: string,
  sourceTeamspaceId: string | null,
  targetTeamspaceId: string | null,
) {
  const [sourceOrg, targetOrg] = await Promise.all([
    resolveTeamspaceOrg(db, sourceTeamspaceId, organizationId),
    resolveTeamspaceOrg(db, targetTeamspaceId, organizationId),
  ]);
  if (sourceOrg !== organizationId || targetOrg !== organizationId) {
    throw new GraphError(
      "ORG_MISMATCH",
      "Edge endpoints must belong to the same organization",
    );
  }
}

async function mapNodeRow(
  db: Db,
  row: typeof schema.nodes.$inferSelect,
): Promise<NonNullable<Awaited<ReturnType<GraphWritePort["createNode"]>>>> {
  const catalog = await db
    .select({
      key: schema.nodeCatalog.key,
      label: schema.nodeCatalog.label,
    })
    .from(schema.nodeCatalog)
    .where(eq(schema.nodeCatalog.id, row.nodeCatalogId))
    .limit(1);

  return {
    id: row.id,
    teamspaceId: row.teamspaceId,
    nodeCatalogId: row.nodeCatalogId,
    catalogKey: catalog[0]?.key ?? "",
    catalogLabel: catalog[0]?.label ?? "",
    title: row.title,
    properties: row.properties,
    schemaVersion: row.schemaVersion,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createGraphWritePort(
  db: Db,
  scope: GraphPortsScope,
): GraphWritePort {
  const { organizationId, teamspaceId, accountId } = scope;
  const accountIdValue = accountId ?? null;

  return {
    async createNode(input: ResolvedCreateNodeInput) {
      if (input.teamspaceId !== teamspaceId) {
        throw new GraphError(
          "ORG_MISMATCH",
          "Input teamspaceId does not match port scope",
        );
      }

      const [row] = await db
        .insert(schema.nodes)
        .values({
          teamspaceId,
          accountId: accountIdValue,
          nodeCatalogId: input.nodeCatalogId,
          title: input.title,
          properties: input.properties ?? {},
          schemaVersion: input.schemaVersion ?? 1,
        })
        .returning();

      const node = await mapNodeRow(db, row!);

      if (input.initiativeId) {
        const [initiative] = await db
          .select({ id: schema.nodes.id })
          .from(schema.nodes)
          .where(
            and(
              eq(schema.nodes.teamspaceId, teamspaceId),
              eq(schema.nodes.id, input.initiativeId),
            ),
          )
          .limit(1);
        if (!initiative) {
          throw new GraphError("NOT_FOUND", "Initiative not found");
        }

        const [edgeCatalog] = await db
          .select({ id: schema.edgeCatalog.id })
          .from(schema.edgeCatalog)
          .where(
            and(
              eq(schema.edgeCatalog.organizationId, organizationId),
              eq(schema.edgeCatalog.key, "for_initiative"),
            ),
          )
          .limit(1);
        if (!edgeCatalog) {
          throw new GraphError(
            "UNKNOWN_EDGE_TYPE",
            "for_initiative edge catalog not found",
          );
        }

        await db.insert(schema.edges).values({
          teamspaceId,
          accountId: accountIdValue,
          edgeCatalogId: edgeCatalog.id,
          sourceNodeId: node.id,
          targetNodeId: input.initiativeId,
          properties: {},
        });
      }

      return node;
    },

    async updateNode(input: UpdateNodeInput) {
      if (input.teamspaceId !== teamspaceId) {
        throw new GraphError(
          "ORG_MISMATCH",
          "Input teamspaceId does not match port scope",
        );
      }

      const [existing] = await db
        .select({ accountId: schema.nodes.accountId })
        .from(schema.nodes)
        .where(
          and(
            eq(schema.nodes.teamspaceId, teamspaceId),
            eq(schema.nodes.id, input.nodeId),
          ),
        )
        .limit(1);
      if (!existing) {
        throw new GraphError("NOT_FOUND", `Node '${input.nodeId}' not found`);
      }
      assertEndUserWritableRow(accountId, existing.accountId, "node");

      const set: Partial<typeof schema.nodes.$inferInsert> = {
        updatedAt: new Date(),
      };
      if (input.title !== undefined) set.title = input.title;
      if (input.properties !== undefined) set.properties = input.properties;

      const [row] = await db
        .update(schema.nodes)
        .set(set)
        .where(
          and(
            eq(schema.nodes.teamspaceId, teamspaceId),
            eq(schema.nodes.id, input.nodeId),
          ),
        )
        .returning();

      if (!row) {
        throw new GraphError("NOT_FOUND", `Node '${input.nodeId}' not found`);
      }

      return mapNodeRow(db, row);
    },

    async createEdge(input: ResolvedCreateEdgeInput) {
      if (input.teamspaceId !== teamspaceId) {
        throw new GraphError(
          "ORG_MISMATCH",
          "Input teamspaceId does not match port scope",
        );
      }

      const [source] = await db
        .select({
          teamspaceId: schema.nodes.teamspaceId,
          nodeCatalogId: schema.nodes.nodeCatalogId,
        })
        .from(schema.nodes)
        .where(eq(schema.nodes.id, input.sourceNodeId))
        .limit(1);
      const [target] = await db
        .select({
          teamspaceId: schema.nodes.teamspaceId,
          nodeCatalogId: schema.nodes.nodeCatalogId,
        })
        .from(schema.nodes)
        .where(eq(schema.nodes.id, input.targetNodeId))
        .limit(1);

      if (!source || !target) {
        throw new GraphError("NOT_FOUND", "Source or target node not found");
      }
      await assertEndpointsSameOrg(
        db,
        organizationId,
        source.teamspaceId,
        target.teamspaceId,
      );

      const [edgeCatalog] = await db
        .select()
        .from(schema.edgeCatalog)
        .where(
          and(
            eq(schema.edgeCatalog.organizationId, organizationId),
            eq(schema.edgeCatalog.id, input.edgeCatalogId),
          ),
        )
        .limit(1);
      if (!edgeCatalog) {
        throw new GraphError("UNKNOWN_EDGE_TYPE", "Edge catalog entry not found");
      }

      const domainIds = edgeCatalog.domainCatalogIds ?? [];
      const rangeIds = edgeCatalog.rangeCatalogIds ?? [];
      if (
        domainIds.length > 0 &&
        !domainIds.includes(source.nodeCatalogId)
      ) {
        throw new GraphError(
          "VALIDATION_FAILED",
          "Source node catalog is not in edge domain",
        );
      }
      if (
        rangeIds.length > 0 &&
        !rangeIds.includes(target.nodeCatalogId)
      ) {
        throw new GraphError(
          "VALIDATION_FAILED",
          "Target node catalog is not in edge range",
        );
      }

      const [row] = await db
        .insert(schema.edges)
        .values({
          teamspaceId,
          accountId: accountIdValue,
          edgeCatalogId: input.edgeCatalogId,
          sourceNodeId: input.sourceNodeId,
          targetNodeId: input.targetNodeId,
          properties: input.properties ?? {},
        })
        .returning();

      const [edgeCatalogMeta] = await db
        .select({
          key: schema.edgeCatalog.key,
          label: schema.edgeCatalog.label,
        })
        .from(schema.edgeCatalog)
        .where(eq(schema.edgeCatalog.id, row!.edgeCatalogId))
        .limit(1);

      return {
        id: row!.id,
        teamspaceId: row!.teamspaceId,
        edgeCatalogId: row!.edgeCatalogId,
        catalogKey: edgeCatalogMeta?.key ?? "",
        catalogLabel: edgeCatalogMeta?.label ?? "",
        sourceNodeId: row!.sourceNodeId,
        targetNodeId: row!.targetNodeId,
        properties: row!.properties,
        createdAt: row!.createdAt,
      };
    },

    async deleteEdge(input: DeleteEdgeInput) {
      if (input.teamspaceId !== teamspaceId) {
        throw new GraphError(
          "ORG_MISMATCH",
          "Input teamspaceId does not match port scope",
        );
      }

      const [existing] = await db
        .select({ accountId: schema.edges.accountId })
        .from(schema.edges)
        .where(
          and(
            eq(schema.edges.teamspaceId, teamspaceId),
            eq(schema.edges.id, input.edgeId),
          ),
        )
        .limit(1);
      if (!existing) {
        throw new GraphError("NOT_FOUND", `Edge '${input.edgeId}' not found`);
      }
      assertEndUserWritableRow(accountId, existing.accountId, "edge");

      const deleted = await db
        .delete(schema.edges)
        .where(
          and(
            eq(schema.edges.teamspaceId, teamspaceId),
            eq(schema.edges.id, input.edgeId),
          ),
        )
        .returning({ id: schema.edges.id });

      if (deleted.length === 0) {
        throw new GraphError("NOT_FOUND", `Edge '${input.edgeId}' not found`);
      }
    },

    async deleteNode(input: DeleteNodeInput) {
      if (input.teamspaceId !== teamspaceId) {
        throw new GraphError(
          "ORG_MISMATCH",
          "Input teamspaceId does not match port scope",
        );
      }

      const [existing] = await db
        .select({ accountId: schema.nodes.accountId })
        .from(schema.nodes)
        .where(
          and(
            eq(schema.nodes.teamspaceId, teamspaceId),
            eq(schema.nodes.id, input.nodeId),
          ),
        )
        .limit(1);
      if (!existing) {
        throw new GraphError("NOT_FOUND", `Node '${input.nodeId}' not found`);
      }
      assertEndUserWritableRow(accountId, existing.accountId, "node");

      // Remove incident edges first to avoid orphaned references, then the node.
      await db
        .delete(schema.edges)
        .where(
          and(
            eq(schema.edges.teamspaceId, teamspaceId),
            or(
              eq(schema.edges.sourceNodeId, input.nodeId),
              eq(schema.edges.targetNodeId, input.nodeId),
            ),
          ),
        );

      const deleted = await db
        .delete(schema.nodes)
        .where(
          and(
            eq(schema.nodes.teamspaceId, teamspaceId),
            eq(schema.nodes.id, input.nodeId),
          ),
        )
        .returning({ id: schema.nodes.id });

      if (deleted.length === 0) {
        throw new GraphError("NOT_FOUND", `Node '${input.nodeId}' not found`);
      }
    },

    async createInitiativeBundle(
      input: CreateInitiativeBundleInput,
    ): Promise<CreateInitiativeBundleResult> {
      if (input.teamspaceId !== teamspaceId) {
        throw new GraphError(
          "ORG_MISMATCH",
          "Input teamspaceId does not match port scope",
        );
      }

      const [initiativeCatalog] = await db
        .select({ id: schema.nodeCatalog.id })
        .from(schema.nodeCatalog)
        .where(
          and(
            eq(schema.nodeCatalog.organizationId, organizationId),
            eq(schema.nodeCatalog.key, "initiative"),
          ),
        )
        .limit(1);
      const [releaseCatalog] = await db
        .select({ id: schema.nodeCatalog.id })
        .from(schema.nodeCatalog)
        .where(
          and(
            eq(schema.nodeCatalog.organizationId, organizationId),
            eq(schema.nodeCatalog.key, "release"),
          ),
        )
        .limit(1);
      const [pairedCatalog] = await db
        .select({ id: schema.edgeCatalog.id })
        .from(schema.edgeCatalog)
        .where(
          and(
            eq(schema.edgeCatalog.organizationId, organizationId),
            eq(schema.edgeCatalog.key, "paired_with"),
          ),
        )
        .limit(1);

      if (!initiativeCatalog || !releaseCatalog || !pairedCatalog) {
        throw new GraphError(
          "UNKNOWN_NODE_TYPE",
          "Initiative bundle catalog entries missing — run seedDomainCatalog",
        );
      }

      return db.transaction(async (tx) => {
        const initiativeProps = {
          lifecycleStatus: "Draft",
          ...(input.initiativeProperties ?? {}),
        };
        const releaseProps = {
          lifecycleStatus: "Draft",
          ...(input.releaseProperties ?? {}),
        };

        const [initiativeRow] = await tx
          .insert(schema.nodes)
          .values({
            teamspaceId,
            nodeCatalogId: initiativeCatalog.id,
            title: input.initiativeTitle,
            properties: initiativeProps,
            schemaVersion: 1,
          })
          .returning({ id: schema.nodes.id });

        const [releaseRow] = await tx
          .insert(schema.nodes)
          .values({
            teamspaceId,
            nodeCatalogId: releaseCatalog.id,
            title: input.releaseVersion,
            properties: releaseProps,
            schemaVersion: 1,
          })
          .returning({ id: schema.nodes.id });

        const [edgeRow] = await tx
          .insert(schema.edges)
          .values({
            teamspaceId,
            edgeCatalogId: pairedCatalog.id,
            sourceNodeId: initiativeRow!.id,
            targetNodeId: releaseRow!.id,
            properties: {},
          })
          .returning({ id: schema.edges.id });

        return {
          initiativeId: initiativeRow!.id,
          releaseId: releaseRow!.id,
          pairedWithEdgeId: edgeRow!.id,
        };
      });
    },
  };
}
