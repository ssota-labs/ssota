import { createDb } from "@ssota/adapter-postgres";
import { sql } from "drizzle-orm";
import {
  DEFAULT_MCP_ORG_SLUG,
  DEFAULT_MCP_PROJECT_SLUG,
  getDefaultProjectId,
} from "./mcp";

export const INBOUND_SLACK_TEAM_ID = "T01SSOTA-INBOUND-E2E";
export const INBOUND_SLACK_WORKSPACE_NAME = "SSOTA Labs (E2E)";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

const SLACK_CONNECTOR = process.env.SLACK_CONNECT_CONNECTOR ?? "slack/dev";

async function workspaceAccountIds(): Promise<{
  teamspaceId: string;
  accountId: string;
}> {
  const teamspaceId = await getDefaultProjectId();
  const { db, client } = createDb(databaseUrl);
  try {
    const [row] = (await db.execute(sql`
      SELECT a.id AS account_id
      FROM accounts a
      WHERE a.teamspace_id = ${teamspaceId}
        AND a.slug = 'workspace'
      LIMIT 1
    `)) as { account_id: string }[];

    if (!row) {
      throw new Error(
        `workspace account not found for ${DEFAULT_MCP_ORG_SLUG}/${DEFAULT_MCP_PROJECT_SLUG}`,
      );
    }

    return { teamspaceId, accountId: row.account_id };
  } finally {
    await client.end();
  }
}

/** Remove inbound Slack credential + workspace link for the smoke project. */
export async function clearInboundSlack(): Promise<void> {
  const { teamspaceId, accountId } = await workspaceAccountIds();
  const { db, client } = createDb(databaseUrl);
  try {
    await db.execute(sql`
      DELETE FROM account_connections
      WHERE account_id = ${accountId}
        AND connector LIKE 'slack%'
    `);
    await db.execute(sql`
      DELETE FROM chat_workspaces
      WHERE teamspace_id = ${teamspaceId}
        AND platform = 'slack'
    `);
  } finally {
    await client.end();
  }
}

/** Seed Vercel Connect row + chat_workspaces link so Channels shows Connected. */
export async function seedInboundSlackConnected(): Promise<void> {
  const { teamspaceId, accountId } = await workspaceAccountIds();
  const { db, client } = createDb(databaseUrl);
  try {
    await db.execute(sql`
      DELETE FROM account_connections
      WHERE account_id = ${accountId}
        AND connector LIKE 'slack%'
    `);
    await db.execute(sql`
      DELETE FROM chat_workspaces
      WHERE teamspace_id = ${teamspaceId}
        AND platform = 'slack'
    `);

    await db.execute(sql`
      INSERT INTO account_connections (
        teamspace_id, account_id, connector, installation_id, tenant_id, name
      ) VALUES (
        ${teamspaceId}, ${accountId}, ${SLACK_CONNECTOR},
        ${INBOUND_SLACK_TEAM_ID}, ${INBOUND_SLACK_TEAM_ID}, ${INBOUND_SLACK_WORKSPACE_NAME}
      )
      ON CONFLICT (account_id, connector, installation_id) DO UPDATE
      SET tenant_id = EXCLUDED.tenant_id,
          name = EXCLUDED.name,
          updated_at = now()
    `);

    await db.execute(sql`
      INSERT INTO chat_workspaces (
        teamspace_id, account_id, platform, workspace_key, name
      ) VALUES (
        ${teamspaceId}, ${accountId}, 'slack',
        ${INBOUND_SLACK_TEAM_ID}, ${INBOUND_SLACK_WORKSPACE_NAME}
      )
      ON CONFLICT (workspace_key) DO UPDATE
      SET teamspace_id = EXCLUDED.teamspace_id,
          account_id = EXCLUDED.account_id,
          name = EXCLUDED.name,
          updated_at = now()
    `);
  } finally {
    await client.end();
  }
}
