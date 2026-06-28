/**
 * Seed fake account_connections for the ssota-dev workspace account (local UI demo).
 * Requires `pnpm db:seed` first. Does not run as part of the default seed.
 *
 *   pnpm db:seed:demo-connections
 */
import { createDb } from "@ssota/adapter-postgres";
import { sql } from "drizzle-orm";

async function main() {
  const databaseUrl =
    process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
  const { db, client } = createDb(databaseUrl);

  const [row] = (await db.execute(sql`
    SELECT p.id AS teamspace_id, a.id AS account_id
    FROM projects p
    JOIN accounts a ON a.teamspace_id = p.id AND a.slug = 'workspace'
    WHERE p.slug = 'ssota-dev'
    LIMIT 1
  `)) as { teamspace_id: string; account_id: string }[];

  if (!row) {
    throw new Error("ssota-dev workspace account not found — run pnpm db:seed");
  }

  const { teamspace_id: teamspaceId, account_id: accountId } = row;

  await db.execute(sql`DELETE FROM account_connections WHERE account_id = ${accountId}`);

  const demoConnections = [
    {
      connector: "slack/dev",
      installationId: "T01SSOTA-DEMO",
      tenantId: "T01SSOTA-DEMO",
      name: "SSOTA Labs",
    },
    {
      connector: "slack/dev",
      installationId: "T02ACME-DEMO",
      tenantId: "T02ACME-DEMO",
      name: "Acme Product",
    },
    {
      connector: "notion/dev",
      installationId: "notion-ws-1",
      tenantId: "notion-ws-1",
      name: "Product Wiki",
    },
    {
      connector: "github/dev",
      installationId: "gh-org-ssota",
      tenantId: "gh-org-ssota",
      name: "ssota-labs",
    },
    {
      connector: "discord/dev",
      installationId: "discord-guild-1",
      tenantId: "9876543210",
      name: "SSOTA Community",
    },
    {
      connector: "linear/dev",
      installationId: "",
      tenantId: "linear-ws-1",
      name: "SSOTA Engineering",
    },
  ];

  for (const c of demoConnections) {
    await db.execute(sql`
      INSERT INTO account_connections (
        teamspace_id, account_id, connector, installation_id, tenant_id, name
      ) VALUES (
        ${teamspaceId}, ${accountId}, ${c.connector}, ${c.installationId},
        ${c.tenantId}, ${c.name}
      )
      ON CONFLICT (account_id, connector, installation_id) DO UPDATE
      SET tenant_id = EXCLUDED.tenant_id, name = EXCLUDED.name, updated_at = now()
    `);
  }

  console.log(`Seeded ${demoConnections.length} demo connections for account ${accountId}`);
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
