import { toCatalogLabel, toCatalogSlug } from "@ssota/core";
import type { createDb } from "../db/client.js";
import * as schema from "../db/schema.js";
import { listSsotaDevLinkActionContracts } from "./ssota-dev-link-actions.js";

type Db = ReturnType<typeof createDb>["db"];

/** SSOTA-on-SSOTA dogfood project — atomic link_* action catalog (v3.5.4). */
export async function seedSsotaDevLinkActions(
  db: Db,
  projectId: string,
): Promise<void> {
  const rows = listSsotaDevLinkActionContracts();

  await db
    .insert(schema.actionCatalog)
    .values(
      rows.map((row) => ({
        projectId,
        ...row,
        slug: toCatalogSlug(row.actionType),
        label: toCatalogLabel(row.actionType),
        executor: row.executor as "Agent" | "Human" | "System",
      })) as (typeof schema.actionCatalog.$inferInsert)[],
    )
    .onConflictDoNothing();
}
