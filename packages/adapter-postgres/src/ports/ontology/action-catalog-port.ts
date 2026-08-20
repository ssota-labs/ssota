import { and, asc, eq } from "drizzle-orm";
import {
  actionTypeFromRow,
  parseActionType,
  upsertActionInputSchema,
  type ActionCatalogRow,
  type ActionType,
} from "@ssota/contracts";
import type { ActionCatalogPort } from "@ssota/core";
import type { Db } from "../../db/client.js";
import * as schema from "../../db/schema.js";

/**
 * DB ActionCatalogPort — `action_catalog` 행 ↔ ActionType.
 *
 * - org-scoped: 모든 조회·쓰기는 `organizationId`로 격리 [GRAPH-03과 같은 격리 축].
 * - `definition` jsonb를 읽을 때도 `parseActionType`으로 다시 검증한다 — 저장된 정의가
 *   스키마 진화로 어긋나면 그 행은 조용히 통과시키지 않고 여기서 드러낸다.
 */
export interface DbActionCatalogScope {
  organizationId: string;
}

function toRow(row: typeof schema.actionCatalog.$inferSelect): ActionCatalogRow {
  const type: ActionType = parseActionType({
    ...row.definition,
    key: row.key,
    label: row.label,
    description: row.description ?? "",
  });
  return {
    ...type,
    id: row.id,
    organizationId: row.organizationId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function definitionOf(type: ActionType): Record<string, unknown> {
  const { key: _k, label: _l, description: _d, ...definition } = type;
  return definition;
}

export function createDbActionCatalogPort(
  db: Db,
  scope: DbActionCatalogScope,
): ActionCatalogPort {
  const { organizationId } = scope;

  async function findRow(key: string) {
    const [row] = await db
      .select()
      .from(schema.actionCatalog)
      .where(
        and(
          eq(schema.actionCatalog.organizationId, organizationId),
          eq(schema.actionCatalog.key, key),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  return {
    async getActionByKey(key) {
      const row = await findRow(key);
      return row ? actionTypeFromRow(toRow(row)) : null;
    },
    async listActions() {
      const rows = await this.listActionRows();
      return rows.map(actionTypeFromRow);
    },
    async listActionRows() {
      const rows = await db
        .select()
        .from(schema.actionCatalog)
        .where(eq(schema.actionCatalog.organizationId, organizationId))
        .orderBy(asc(schema.actionCatalog.key));
      return rows.map(toRow);
    },
    async getActionRowByKey(key) {
      const row = await findRow(key);
      return row ? toRow(row) : null;
    },
    async upsertAction(rawInput) {
      const { id, ...type } = upsertActionInputSchema.parse(rawInput);
      const values = {
        key: type.key,
        label: type.label,
        description: type.description,
        definition: definitionOf(type),
        updatedAt: new Date(),
      };
      if (id) {
        const [row] = await db
          .update(schema.actionCatalog)
          .set(values)
          .where(
            and(
              eq(schema.actionCatalog.organizationId, organizationId),
              eq(schema.actionCatalog.id, id),
            ),
          )
          .returning();
        if (!row) throw new Error(`action ${id} not found in organization`);
        return toRow(row);
      }
      const [row] = await db
        .insert(schema.actionCatalog)
        .values({ organizationId, ...values })
        .onConflictDoUpdate({
          target: [schema.actionCatalog.organizationId, schema.actionCatalog.key],
          set: values,
        })
        .returning();
      return toRow(row!);
    },
    async deleteAction(key) {
      await db
        .delete(schema.actionCatalog)
        .where(
          and(
            eq(schema.actionCatalog.organizationId, organizationId),
            eq(schema.actionCatalog.key, key),
          ),
        );
    },
  };
}
