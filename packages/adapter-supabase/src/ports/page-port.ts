import { and, asc, eq, isNull } from "drizzle-orm";
import type { ActionPortsScope, PagePort } from "@ssota/core";
import {
  pageRecordSchema,
  pageSchema,
  type Page,
  type PageRecord,
} from "@ssota/contracts";
import type { Db } from "../db/client.js";
import * as schema from "../db/schema.js";

type PageRow = typeof schema.pages.$inferSelect;

function mapPage(row: PageRow): Page {
  return pageSchema.parse({
    id: row.id,
    projectId: row.projectId,
    accountId: row.accountId ?? null,
    title: row.title,
    icon: row.icon ?? null,
    slug: row.slug ?? null,
    parentId: row.parentId ?? null,
    position: row.position,
    subjectNodeId: row.subjectNodeId ?? null,
    spec: row.spec,
    bindings: row.bindings,
    actions: row.actions,
  });
}

/**
 * DB-backed {@link PagePort} over the `pages` table (Notion-style tree). Pages
 * are project-scoped; `accountId` is carried for interface symmetry. Replaces the
 * page-as-graph-node reads/writes (`queryNodes({catalogKey:"page"})`).
 */
export function createPagePort(db: Db, scope: ActionPortsScope): PagePort {
  const { projectId } = scope;
  return {
    async listPages() {
      const rows = await db
        .select()
        .from(schema.pages)
        .where(eq(schema.pages.projectId, projectId))
        .orderBy(asc(schema.pages.position));
      return rows.map(mapPage);
    },
    async listChildren(parentId) {
      const rows = await db
        .select()
        .from(schema.pages)
        .where(
          and(
            eq(schema.pages.projectId, projectId),
            parentId === null
              ? isNull(schema.pages.parentId)
              : eq(schema.pages.parentId, parentId),
          ),
        )
        .orderBy(asc(schema.pages.position));
      return rows.map(mapPage);
    },
    async getPage(id) {
      const rows = await db
        .select()
        .from(schema.pages)
        .where(
          and(eq(schema.pages.projectId, projectId), eq(schema.pages.id, id)),
        )
        .limit(1);
      return rows[0] ? mapPage(rows[0]) : null;
    },
    async getPageBySlug(slug) {
      const rows = await db
        .select()
        .from(schema.pages)
        .where(
          and(
            eq(schema.pages.projectId, projectId),
            eq(schema.pages.slug, slug),
          ),
        )
        .limit(1);
      return rows[0] ? mapPage(rows[0]) : null;
    },
    async createPage(record: PageRecord) {
      const parsed = pageRecordSchema.parse(record);
      const [row] = await db
        .insert(schema.pages)
        .values({
          projectId,
          parentId: parsed.parentId ?? null,
          position: parsed.position ?? 0,
          title: parsed.title,
          icon: parsed.icon ?? null,
          slug: parsed.slug ?? null,
          subjectNodeId: parsed.subjectNodeId ?? null,
          spec: parsed.spec,
          bindings: parsed.bindings,
          actions: parsed.actions,
        })
        .returning();
      return mapPage(row!);
    },
    async updatePage(id, patch) {
      const set: Partial<typeof schema.pages.$inferInsert> = {
        updatedAt: new Date(),
      };
      if (patch.title !== undefined) set.title = patch.title;
      if (patch.icon !== undefined) set.icon = patch.icon ?? null;
      if (patch.slug !== undefined) set.slug = patch.slug ?? null;
      if (patch.parentId !== undefined) set.parentId = patch.parentId ?? null;
      if (patch.position !== undefined) set.position = patch.position;
      if (patch.subjectNodeId !== undefined)
        set.subjectNodeId = patch.subjectNodeId ?? null;
      if (patch.spec !== undefined) set.spec = patch.spec;
      if (patch.bindings !== undefined) set.bindings = patch.bindings;
      if (patch.actions !== undefined) set.actions = patch.actions;
      const [row] = await db
        .update(schema.pages)
        .set(set)
        .where(
          and(eq(schema.pages.projectId, projectId), eq(schema.pages.id, id)),
        )
        .returning();
      return row ? mapPage(row) : null;
    },
    async movePage(id, parentId, position) {
      const [row] = await db
        .update(schema.pages)
        .set({ parentId: parentId ?? null, position, updatedAt: new Date() })
        .where(
          and(eq(schema.pages.projectId, projectId), eq(schema.pages.id, id)),
        )
        .returning();
      return row ? mapPage(row) : null;
    },
    async deletePage(id) {
      await db
        .delete(schema.pages)
        .where(
          and(eq(schema.pages.projectId, projectId), eq(schema.pages.id, id)),
        );
    },
  };
}
