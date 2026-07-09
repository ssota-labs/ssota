import { createDb } from "@ssota/adapter-postgres";
import { sql } from "drizzle-orm";
import {
  DEFAULT_MCP_ORG_SLUG,
  DEFAULT_MCP_PROJECT_SLUG,
  getDefaultProjectId,
} from "./mcp";

export const INBOUND_KAKAO_BOT_ID = "kakao-bot-e2e";
export const INBOUND_KAKAO_BOT_NAME = "SSOTA Kakao (E2E)";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

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

/** Remove the E2E Kakao workspace link for the smoke project. */
export async function clearInboundKakao(): Promise<void> {
  const { teamspaceId } = await workspaceAccountIds();
  const { db, client } = createDb(databaseUrl);
  try {
    await db.execute(sql`
      DELETE FROM chat_workspaces
      WHERE teamspace_id = ${teamspaceId}
        AND platform = 'kakao'
    `);
  } finally {
    await client.end();
  }
}

/**
 * Seed a `chat_workspaces` Kakao link so Channels shows Connected. Kakao has no
 * OAuth, so — unlike Slack — there is no `account_connections` row to seed.
 */
export async function seedInboundKakaoConnected(): Promise<void> {
  const { teamspaceId, accountId } = await workspaceAccountIds();
  const { db, client } = createDb(databaseUrl);
  try {
    await db.execute(sql`
      DELETE FROM chat_workspaces
      WHERE teamspace_id = ${teamspaceId}
        AND platform = 'kakao'
    `);

    await db.execute(sql`
      INSERT INTO chat_workspaces (
        teamspace_id, account_id, platform, workspace_key, name
      ) VALUES (
        ${teamspaceId}, ${accountId}, 'kakao',
        ${INBOUND_KAKAO_BOT_ID}, ${INBOUND_KAKAO_BOT_NAME}
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
