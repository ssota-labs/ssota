import { and, eq } from "drizzle-orm";
import type { EdgeCatalogRow, NodeCatalogRow } from "@ssota/contracts";
import type { CatalogWritePort } from "@ssota/core";
import type { Db } from "../db/client.js";
import * as schema from "../db/schema.js";

export interface DbCatalogWriteScope {
  projectId: string;
}

export function createDbCatalogWritePort(
  db: Db,
  scope: DbCatalogWriteScope,
): CatalogWritePort {
  const { projectId } = scope;

  return {
    async upsertNodeCatalog(entry) {
      if (entry.id) {
        const [row] = await db
          .update(schema.nodeCatalog)
          .set({
            key: entry.key,
            label: entry.label,
            propertySchema: entry.propertySchema ?? {},
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(schema.nodeCatalog.projectId, projectId),
              eq(schema.nodeCatalog.id, entry.id),
            ),
          )
          .returning();
        return row as NodeCatalogRow;
      }

      const [row] = await db
        .insert(schema.nodeCatalog)
        .values({
          projectId,
          key: entry.key,
          label: entry.label,
          propertySchema: entry.propertySchema ?? {},
        })
        .onConflictDoUpdate({
          target: [schema.nodeCatalog.projectId, schema.nodeCatalog.key],
          set: {
            label: entry.label,
            propertySchema: entry.propertySchema ?? {},
            updatedAt: new Date(),
          },
        })
        .returning();
      return {
        id: row!.id,
        projectId: row!.projectId,
        key: row!.key,
        label: row!.label,
        propertySchema: row!.propertySchema ?? {},
      };
    },

    async upsertEdgeCatalog(entry) {
      if (entry.id) {
        const [row] = await db
          .update(schema.edgeCatalog)
          .set({
            key: entry.key,
            label: entry.label,
            domainCatalogIds: entry.domainCatalogIds,
            rangeCatalogIds: entry.rangeCatalogIds,
            propertySchema: entry.propertySchema,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(schema.edgeCatalog.projectId, projectId),
              eq(schema.edgeCatalog.id, entry.id),
            ),
          )
          .returning();
        return {
          id: row!.id,
          projectId: row!.projectId,
          key: row!.key,
          label: row!.label,
          domainCatalogIds: row!.domainCatalogIds ?? [],
          rangeCatalogIds: row!.rangeCatalogIds ?? [],
          propertySchema: row!.propertySchema ?? null,
        };
      }

      const [row] = await db
        .insert(schema.edgeCatalog)
        .values({
          projectId,
          key: entry.key,
          label: entry.label,
          domainCatalogIds: entry.domainCatalogIds ?? [],
          rangeCatalogIds: entry.rangeCatalogIds ?? [],
          propertySchema: entry.propertySchema ?? null,
        })
        .onConflictDoUpdate({
          target: [schema.edgeCatalog.projectId, schema.edgeCatalog.key],
          set: {
            label: entry.label,
            domainCatalogIds: entry.domainCatalogIds ?? [],
            rangeCatalogIds: entry.rangeCatalogIds ?? [],
            propertySchema: entry.propertySchema ?? null,
            updatedAt: new Date(),
          },
        })
        .returning();

      return {
        id: row!.id,
        projectId: row!.projectId,
        key: row!.key,
        label: row!.label,
        domainCatalogIds: row!.domainCatalogIds ?? [],
        rangeCatalogIds: row!.rangeCatalogIds ?? [],
        propertySchema: row!.propertySchema ?? null,
      } satisfies EdgeCatalogRow;
    },

    async deleteNodeCatalog(id) {
      await db
        .delete(schema.nodeCatalog)
        .where(
          and(
            eq(schema.nodeCatalog.projectId, projectId),
            eq(schema.nodeCatalog.id, id),
          ),
        );
    },

    async deleteEdgeCatalog(id) {
      await db
        .delete(schema.edgeCatalog)
        .where(
          and(
            eq(schema.edgeCatalog.projectId, projectId),
            eq(schema.edgeCatalog.id, id),
          ),
        );
    },
  };
}
