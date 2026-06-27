import { and, eq } from "drizzle-orm";
import type { ActionPortsScope, PageViewStatePort } from "@ssota/core";
import { tableViewStateSchema, type TableViewState } from "@ssota/contracts";
import type { Db } from "../db/client.js";
import * as schema from "../db/schema.js";

/**
 * DB-backed {@link PageViewStatePort} over the `page_view_states` table. Rows are
 * scoped by (project, user, page, element); upsert via the unique constraint on
 * (user, page, element). View-state blobs are validated through
 * {@link tableViewStateSchema} on both read and write.
 */
export function createPageViewStatePort(
  db: Db,
  scope: ActionPortsScope,
): PageViewStatePort {
  const { teamspaceId } = scope;
  return {
    async getForPage(userId, pageId) {
      const rows = await db
        .select()
        .from(schema.pageViewStates)
        .where(
          and(
            eq(schema.pageViewStates.teamspaceId, teamspaceId),
            eq(schema.pageViewStates.userId, userId),
            eq(schema.pageViewStates.pageId, pageId),
          ),
        );
      const out: Record<string, TableViewState> = {};
      for (const row of rows) {
        const parsed = tableViewStateSchema.safeParse(row.viewState);
        if (parsed.success) out[row.elementId] = parsed.data;
      }
      return out;
    },

    async upsert({ userId, pageId, elementId, viewState }) {
      const value = tableViewStateSchema.parse(viewState);
      await db
        .insert(schema.pageViewStates)
        .values({ teamspaceId, userId, pageId, elementId, viewState: value })
        .onConflictDoUpdate({
          target: [
            schema.pageViewStates.userId,
            schema.pageViewStates.pageId,
            schema.pageViewStates.elementId,
          ],
          set: { viewState: value, updatedAt: new Date() },
        });
    },
  };
}
