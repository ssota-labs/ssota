import { and, eq } from "drizzle-orm";
import type {
  CreateEdgeInput,
  CreateInitiativeBundleInput,
  CreateNodeInput,
  DeleteEdgeInput,
  UpdateNodeInput,
} from "@ssota/contracts/graph";
import { GraphError, type CreateInitiativeBundleResult, type GraphWritePort } from "@ssota/core";
import type { Db } from "../db/client.js";
import * as schema from "../db/schema.js";
import type { GraphPortsScope } from "./graph-read-port.js";

function assertSameProject(projectId: string, actual: string, label: string) {
  if (actual !== projectId) {
    throw new GraphError(
      "PROJECT_MISMATCH",
      `${label} belongs to a different project`,
    );
  }
}

export function createGraphWritePort(
  db: Db,
  scope: GraphPortsScope,
): GraphWritePort {
  const { projectId } = scope;

  return {
    async createNode(input: CreateNodeInput) {
      if (input.projectId !== projectId) {
        throw new GraphError(
          "PROJECT_MISMATCH",
          "Input projectId does not match port scope",
        );
      }

      const [row] = await db
        .insert(schema.nodes)
        .values({
          projectId,
          nodeType: input.nodeType,
          title: input.title,
          properties: input.properties ?? {},
          content: input.content ?? null,
          lifecycleStatus: input.lifecycleStatus ?? "Draft",
          schemaVersion: input.schemaVersion ?? 1,
        })
        .returning();

      const node = {
        id: row!.id,
        projectId: row!.projectId,
        nodeType: row!.nodeType,
        title: row!.title,
        properties: row!.properties,
        content: row!.content,
        lifecycleStatus: row!.lifecycleStatus,
        schemaVersion: row!.schemaVersion,
        createdAt: row!.createdAt,
        updatedAt: row!.updatedAt,
      };

      if (input.initiativeId) {
        const [initiative] = await db
          .select({ id: schema.nodes.id })
          .from(schema.nodes)
          .where(
            and(
              eq(schema.nodes.projectId, projectId),
              eq(schema.nodes.id, input.initiativeId),
            ),
          )
          .limit(1);
        if (!initiative) {
          throw new GraphError("NOT_FOUND", "Initiative not found");
        }
        await db.insert(schema.edges).values({
          projectId,
          edgeType: "for_initiative",
          sourceNodeId: node.id,
          targetNodeId: input.initiativeId,
          properties: {},
        });
      }

      return node;
    },

    async updateNode(input: UpdateNodeInput) {
      if (input.projectId !== projectId) {
        throw new GraphError(
          "PROJECT_MISMATCH",
          "Input projectId does not match port scope",
        );
      }

      const set: Partial<typeof schema.nodes.$inferInsert> = {
        updatedAt: new Date(),
      };
      if (input.title !== undefined) set.title = input.title;
      if (input.properties !== undefined) set.properties = input.properties;
      if (input.content !== undefined) set.content = input.content;
      if (input.lifecycleStatus !== undefined) {
        set.lifecycleStatus = input.lifecycleStatus;
      }

      const [row] = await db
        .update(schema.nodes)
        .set(set)
        .where(
          and(
            eq(schema.nodes.projectId, projectId),
            eq(schema.nodes.id, input.nodeId),
          ),
        )
        .returning();

      if (!row) {
        throw new GraphError("NOT_FOUND", `Node '${input.nodeId}' not found`);
      }

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
    },

    async createEdge(input: CreateEdgeInput) {
      if (input.projectId !== projectId) {
        throw new GraphError(
          "PROJECT_MISMATCH",
          "Input projectId does not match port scope",
        );
      }

      const [source] = await db
        .select({ projectId: schema.nodes.projectId })
        .from(schema.nodes)
        .where(eq(schema.nodes.id, input.sourceNodeId))
        .limit(1);
      const [target] = await db
        .select({ projectId: schema.nodes.projectId })
        .from(schema.nodes)
        .where(eq(schema.nodes.id, input.targetNodeId))
        .limit(1);

      if (!source || !target) {
        throw new GraphError("NOT_FOUND", "Source or target node not found");
      }
      assertSameProject(projectId, source.projectId, "Source node");
      assertSameProject(projectId, target.projectId, "Target node");

      const [row] = await db
        .insert(schema.edges)
        .values({
          projectId,
          edgeType: input.edgeType,
          sourceNodeId: input.sourceNodeId,
          targetNodeId: input.targetNodeId,
          properties: input.properties ?? {},
        })
        .returning();

      return {
        id: row!.id,
        projectId: row!.projectId,
        edgeType: row!.edgeType,
        sourceNodeId: row!.sourceNodeId,
        targetNodeId: row!.targetNodeId,
        properties: row!.properties,
        createdAt: row!.createdAt,
      };
    },

    async deleteEdge(input: DeleteEdgeInput) {
      if (input.projectId !== projectId) {
        throw new GraphError(
          "PROJECT_MISMATCH",
          "Input projectId does not match port scope",
        );
      }

      const deleted = await db
        .delete(schema.edges)
        .where(
          and(
            eq(schema.edges.projectId, projectId),
            eq(schema.edges.id, input.edgeId),
          ),
        )
        .returning({ id: schema.edges.id });

      if (deleted.length === 0) {
        throw new GraphError("NOT_FOUND", `Edge '${input.edgeId}' not found`);
      }
    },

    async createInitiativeBundle(
      input: CreateInitiativeBundleInput,
    ): Promise<CreateInitiativeBundleResult> {
      if (input.projectId !== projectId) {
        throw new GraphError(
          "PROJECT_MISMATCH",
          "Input projectId does not match port scope",
        );
      }

      return db.transaction(async (tx) => {
        const [initiativeRow] = await tx
          .insert(schema.nodes)
          .values({
            projectId,
            nodeType: "initiative",
            title: input.initiativeTitle,
            properties: input.initiativeProperties ?? {},
            lifecycleStatus: "Draft",
            schemaVersion: 1,
          })
          .returning({ id: schema.nodes.id });

        const [releaseRow] = await tx
          .insert(schema.nodes)
          .values({
            projectId,
            nodeType: "release",
            title: input.releaseVersion,
            properties: input.releaseProperties ?? {},
            lifecycleStatus: "Draft",
            schemaVersion: 1,
          })
          .returning({ id: schema.nodes.id });

        const [edgeRow] = await tx
          .insert(schema.edges)
          .values({
            projectId,
            edgeType: "paired_with",
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
