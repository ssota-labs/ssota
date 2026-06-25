import { and, eq } from "drizzle-orm";
import type { EdgeCatalogRow, NodeCatalogRow } from "@ssota/contracts";
import type { CatalogWritePort } from "@ssota/core";
import type { Db } from "../db/client.js";
import * as schema from "../db/schema.js";

export interface DbCatalogWriteScope {
  projectId: string;
}

function mapNodeCatalogRow(
  row: typeof schema.nodeCatalog.$inferSelect,
): NodeCatalogRow {
  return {
    id: row.id,
    projectId: row.projectId,
    key: row.key,
    label: row.label,
    description: row.description ?? "",
    keywords: row.keywords ?? [],
    propertySchema: row.propertySchema ?? {},
  };
}

function mapEdgeCatalogRow(
  row: typeof schema.edgeCatalog.$inferSelect,
): EdgeCatalogRow {
  return {
    id: row.id,
    projectId: row.projectId,
    key: row.key,
    label: row.label,
    description: row.description ?? "",
    keywords: row.keywords ?? [],
    domainCatalogIds: row.domainCatalogIds ?? [],
    rangeCatalogIds: row.rangeCatalogIds ?? [],
    propertySchema: row.propertySchema ?? null,
  };
}

export function createDbCatalogWritePort(
  db: Db,
  scope: DbCatalogWriteScope,
): CatalogWritePort {
  const { projectId } = scope;

  return {
    async upsertNodeCatalog(entry) {
      const description = entry.description ?? "";
      const keywords = entry.keywords ?? [];
      if (entry.id) {
        const [row] = await db
          .update(schema.nodeCatalog)
          .set({
            key: entry.key,
            label: entry.label,
            description,
            keywords,
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
        return mapNodeCatalogRow(row!);
      }

      const [row] = await db
        .insert(schema.nodeCatalog)
        .values({
          projectId,
          key: entry.key,
          label: entry.label,
          description,
          keywords,
          propertySchema: entry.propertySchema ?? {},
        })
        .onConflictDoUpdate({
          target: [schema.nodeCatalog.projectId, schema.nodeCatalog.key],
          set: {
            label: entry.label,
            description,
            keywords,
            propertySchema: entry.propertySchema ?? {},
            updatedAt: new Date(),
          },
        })
        .returning();
      return mapNodeCatalogRow(row!);
    },

    async upsertEdgeCatalog(entry) {
      const description = entry.description ?? "";
      const keywords = entry.keywords ?? [];
      if (entry.id) {
        const [row] = await db
          .update(schema.edgeCatalog)
          .set({
            key: entry.key,
            label: entry.label,
            description,
            keywords,
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
        return mapEdgeCatalogRow(row!);
      }

      const [row] = await db
        .insert(schema.edgeCatalog)
        .values({
          projectId,
          key: entry.key,
          label: entry.label,
          description,
          keywords,
          domainCatalogIds: entry.domainCatalogIds ?? [],
          rangeCatalogIds: entry.rangeCatalogIds ?? [],
          propertySchema: entry.propertySchema ?? null,
        })
        .onConflictDoUpdate({
          target: [schema.edgeCatalog.projectId, schema.edgeCatalog.key],
          set: {
            label: entry.label,
            description,
            keywords,
            domainCatalogIds: entry.domainCatalogIds ?? [],
            rangeCatalogIds: entry.rangeCatalogIds ?? [],
            propertySchema: entry.propertySchema ?? null,
            updatedAt: new Date(),
          },
        })
        .returning();

      return mapEdgeCatalogRow(row!);
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
