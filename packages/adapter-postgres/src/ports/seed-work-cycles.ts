import { and, eq, sql } from "drizzle-orm";
import type { Db } from "../db/client.js";
import * as schema from "../db/schema.js";
import { seedDomainCatalog } from "./db-catalog-read-port.js";
import { resolveOrganizationIdForTeamspace } from "../teamspace-org-scope.js";
import workCyclesSeed from "@ssota/contracts/seed-packs/software-development-workflow/work-cycles.json" with { type: "json" };
import gatePoliciesSeed from "@ssota/contracts/seed-packs/software-development-workflow/gate-policies.json" with { type: "json" };

type SeedNodeEntry = {
  title: string;
  properties: Record<string, unknown>;
};

const WORK_CYCLE_SEED_PREFIX = "seed:work_cycle:";
const GATE_POLICY_SEED_PREFIX = "seed:gate_policy:";

async function upsertCatalogNodes(
  db: Db,
  teamspaceId: string,
  catalogKey: string,
  entries: SeedNodeEntry[],
  idempotencyKeyOf: (properties: Record<string, unknown>) => string | null,
): Promise<void> {
  const organizationId = await resolveOrganizationIdForTeamspace(db, teamspaceId);
  const { nodeKeyToId } = await seedDomainCatalog(db, organizationId);
  const nodeCatalogId = nodeKeyToId.get(catalogKey);
  if (!nodeCatalogId) return;

  for (const entry of entries) {
    const key = idempotencyKeyOf(entry.properties);
    if (!key) continue;

    const existing = await db
      .select({ id: schema.nodes.id })
      .from(schema.nodes)
      .where(
        and(
          eq(schema.nodes.teamspaceId, teamspaceId),
          eq(schema.nodes.nodeCatalogId, nodeCatalogId),
          sql`${schema.nodes.properties}->>'seed' = ${key}`,
        ),
      )
      .limit(1);

    const properties = {
      ...entry.properties,
      lifecycleStatus: "Active",
      seed: key,
    };

    if (existing[0]) {
      await db
        .update(schema.nodes)
        .set({
          title: entry.title,
          properties,
          updatedAt: new Date(),
        })
        .where(eq(schema.nodes.id, existing[0].id));
      continue;
    }

    await db.insert(schema.nodes).values({
      teamspaceId,
      nodeCatalogId,
      title: entry.title,
      properties,
      schemaVersion: 1,
    });
  }
}

/** Idempotent seed of work_cycle + gate_policy graph instances for a teamspace. */
export async function seedWorkCycleAndGatePolicies(
  db: Db,
  teamspaceId: string,
): Promise<void> {
  await upsertCatalogNodes(
    db,
    teamspaceId,
    "work_cycle",
    workCyclesSeed as SeedNodeEntry[],
    (props) => {
      const cycleKey = props.cycleKey;
      return typeof cycleKey === "string"
        ? `${WORK_CYCLE_SEED_PREFIX}${cycleKey}`
        : null;
    },
  );

  await upsertCatalogNodes(
    db,
    teamspaceId,
    "gate_policy",
    gatePoliciesSeed as SeedNodeEntry[],
    (props) => {
      const policyKey = props.policyKey;
      return typeof policyKey === "string"
        ? `${GATE_POLICY_SEED_PREFIX}${policyKey}`
        : null;
    },
  );
}
