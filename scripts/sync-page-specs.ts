/**
 * Refresh L3 page spec/bindings/actions from the dev-workflow seed pack for
 * slugs listed in SEED_SPEC_SYNC_SLUGS (see page-port.ts). Use after pulling
 * pages-tree.json changes when a full `pnpm db:seed` is not needed.
 */
import { config as loadEnv } from "dotenv";
import { and, eq } from "drizzle-orm";
import {
  createDb,
  DEFAULT_ORG_SLUG,
  DEFAULT_TEAMSPACE_SLUG,
  schema,
  seedPages,
} from "@ssota/adapter-postgres";

loadEnv({ path: ".env.local" });
loadEnv({ path: "apps/web/.env.local" });
loadEnv();

async function main() {
  const databaseUrl =
    process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
  const { db, client } = createDb(databaseUrl);

  try {
    const [teamspace] = await db
      .select({ id: schema.teamspaces.id })
      .from(schema.teamspaces)
      .innerJoin(
        schema.organizations,
        eq(schema.teamspaces.organizationId, schema.organizations.id),
      )
      .where(
        and(
          eq(schema.organizations.slug, DEFAULT_ORG_SLUG),
          eq(schema.teamspaces.slug, DEFAULT_TEAMSPACE_SLUG),
        ),
      )
      .limit(1);

    if (!teamspace) {
      console.error(
        `Teamspace ${DEFAULT_ORG_SLUG}/${DEFAULT_TEAMSPACE_SLUG} not found. Run pnpm db:seed first.`,
      );
      process.exit(1);
    }

    await seedPages(db, teamspace.id);

    const [market] = await db
      .select({ spec: schema.pages.spec })
      .from(schema.pages)
      .where(eq(schema.pages.slug, "research/market"))
      .limit(1);

    const panelType = (
      market?.spec as { elements?: { sourcesPanel?: { type?: string } } } | null
    )?.elements?.sourcesPanel?.type;

    console.log(`Synced page specs for teamspace ${teamspace.id}.`);
    console.log(`research/market sourcesPanel → ${panelType ?? "missing"}`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
