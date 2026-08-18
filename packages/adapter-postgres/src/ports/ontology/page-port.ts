import { and, asc, eq, isNull } from "drizzle-orm";
import type { PortScope, PagePort } from "@ssota/core";
import {
  pageRecordSchema,
  pageSchema,
  type Page,
  type PageRecord,
} from "@ssota/contracts";
import pagesTreeSeed from "@ssota/contracts/seed-packs/software-development-workflow/pages-tree.json" with { type: "json" };
import type { Db } from "../../db/client.js";
import * as schema from "../../db/schema.js";

type PageRow = typeof schema.pages.$inferSelect;

function mapPage(row: PageRow): Page {
  return pageSchema.parse({
    id: row.id,
    teamspaceId: row.teamspaceId,
    accountId: row.accountId ?? null,
    title: row.title,
    icon: row.icon ?? null,
    slug: row.slug ?? null,
    parentId: row.parentId ?? null,
    position: row.position,
    subjectNodeId: row.subjectNodeId ?? null,
    appliesToNodeType: row.appliesToNodeType ?? null,
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
export function createPagePort(db: Db, scope: PortScope): PagePort {
  const { teamspaceId } = scope;
  return {
    async listPages() {
      const rows = await db
        .select()
        .from(schema.pages)
        .where(eq(schema.pages.teamspaceId, teamspaceId))
        .orderBy(asc(schema.pages.position));
      return rows.map(mapPage);
    },
    async listChildren(parentId) {
      const rows = await db
        .select()
        .from(schema.pages)
        .where(
          and(
            eq(schema.pages.teamspaceId, teamspaceId),
            parentId === null
              ? isNull(schema.pages.parentId)
              : eq(schema.pages.parentId, parentId),
          ),
        )
        .orderBy(asc(schema.pages.position));
      return rows.map(mapPage);
    },
    async listTemplatesForNodeType(catalogKey) {
      const rows = await db
        .select()
        .from(schema.pages)
        .where(
          and(
            eq(schema.pages.teamspaceId, teamspaceId),
            eq(schema.pages.appliesToNodeType, catalogKey),
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
          and(eq(schema.pages.teamspaceId, teamspaceId), eq(schema.pages.id, id)),
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
            eq(schema.pages.teamspaceId, teamspaceId),
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
          teamspaceId,
          parentId: parsed.parentId ?? null,
          position: parsed.position ?? 0,
          title: parsed.title,
          icon: parsed.icon ?? null,
          slug: parsed.slug ?? null,
          subjectNodeId: parsed.subjectNodeId ?? null,
          appliesToNodeType: parsed.appliesToNodeType ?? null,
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
      if (patch.appliesToNodeType !== undefined)
        set.appliesToNodeType = patch.appliesToNodeType ?? null;
      if (patch.spec !== undefined) set.spec = patch.spec;
      if (patch.bindings !== undefined) set.bindings = patch.bindings;
      if (patch.actions !== undefined) set.actions = patch.actions;
      const [row] = await db
        .update(schema.pages)
        .set(set)
        .where(
          and(eq(schema.pages.teamspaceId, teamspaceId), eq(schema.pages.id, id)),
        )
        .returning();
      return row ? mapPage(row) : null;
    },
    async movePage(id, parentId, position) {
      const [row] = await db
        .update(schema.pages)
        .set({ parentId: parentId ?? null, position, updatedAt: new Date() })
        .where(
          and(eq(schema.pages.teamspaceId, teamspaceId), eq(schema.pages.id, id)),
        )
        .returning();
      return row ? mapPage(row) : null;
    },
    async deletePage(id) {
      await db
        .delete(schema.pages)
        .where(
          and(eq(schema.pages.teamspaceId, teamspaceId), eq(schema.pages.id, id)),
        );
    },
  };
}

interface PageTreeSeedEntry {
  key: string;
  parentKey: string | null;
  title: string;
  icon?: string;
  /** Node-type drill-in template marker (e.g. "initiative"); null = L0 page. */
  appliesToNodeType?: string | null;
  spec: unknown;
  bindings?: Record<string, unknown>;
  actions?: Record<string, unknown>;
}

/** Seed slugs whose spec/bindings/actions are refreshed on re-seed (dogfood pack updates). */
const SEED_SPEC_SYNC_SLUGS = new Set([
  "executive/roadmap",
  "executive/goals",
  "research/market",
  "research/user",
  "research/hypotheses",
]);

/**
 * Bootstrap-seed the software-development page tree (Notion-style) into the
 * `pages` table. Idempotent via `slug` (= the seed `key`); re-running never
 * clobbers tenant edits. Entries are ordered parents-first so `parentKey`
 * resolves against already-inserted rows. Call alongside `seedWorkflowInstructions` /
 * `seedDomainCatalog` at project creation.
 */
export async function seedPages(
  db: Db,
  teamspaceId: string,
  pages: PageTreeSeedEntry[] = pagesTreeSeed as unknown as PageTreeSeedEntry[],
): Promise<void> {
  const entries = pages;
  const keyToId = new Map<string, string>();
  const positionByParent = new Map<string, number>();

  for (const entry of entries) {
    const parentId = entry.parentKey
      ? (keyToId.get(entry.parentKey) ?? null)
      : null;

    const existing = await db
      .select({ id: schema.pages.id })
      .from(schema.pages)
      .where(
        and(
          eq(schema.pages.teamspaceId, teamspaceId),
          eq(schema.pages.slug, entry.key),
        ),
      )
      .limit(1);
    if (existing[0]) {
      keyToId.set(entry.key, existing[0].id);
      const shouldSyncSpec =
        SEED_SPEC_SYNC_SLUGS.has(entry.key) ||
        (entry.bindings && Object.keys(entry.bindings).length > 0) ||
        (entry.actions && Object.keys(entry.actions).length > 0);
      if (shouldSyncSpec) {
        const synced = pageRecordSchema.parse({
          title: entry.title,
          icon: entry.icon,
          slug: entry.key,
          appliesToNodeType: entry.appliesToNodeType ?? null,
          spec: entry.spec,
          bindings: entry.bindings ?? {},
          actions: entry.actions ?? {},
        });
        await db
          .update(schema.pages)
          .set({
            spec: synced.spec,
            bindings: synced.bindings,
            actions: synced.actions,
            updatedAt: new Date(),
          })
          .where(eq(schema.pages.id, existing[0].id));
      }
      continue;
    }

    // Root-level position counters are namespaced per tree (L0 vs each node-type
    // template) so their orderings don't interleave.
    const posKey =
      entry.parentKey ?? `__root__:${entry.appliesToNodeType ?? "null"}`;
    const position = positionByParent.get(posKey) ?? 0;
    positionByParent.set(posKey, position + 1);

    const parsed = pageRecordSchema.parse({
      title: entry.title,
      icon: entry.icon,
      slug: entry.key,
      parentId,
      position,
      appliesToNodeType: entry.appliesToNodeType ?? null,
      spec: entry.spec,
      bindings: entry.bindings ?? {},
      actions: entry.actions ?? {},
    });

    const [row] = await db
      .insert(schema.pages)
      .values({
        teamspaceId,
        parentId,
        position,
        title: parsed.title,
        icon: parsed.icon ?? null,
        slug: parsed.slug ?? null,
        appliesToNodeType: parsed.appliesToNodeType ?? null,
        spec: parsed.spec,
        bindings: parsed.bindings,
        actions: parsed.actions,
      })
      .returning({ id: schema.pages.id });
    keyToId.set(entry.key, row!.id);
  }
}
