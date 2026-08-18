import type { Db } from "../../db/client.js";
import { createDbAccountReadPort } from "../../ports/platform/account-read-port.js";
import { createAccountConnectionPort } from "../../ports/platform/account-port.js";
import { createChatWorkspacePort } from "../../ports/agents/chat-workspace-port.js";

const SEED_SLACK_WORKSPACES = [
  { workspaceKey: "T01SSOTA-SEED", name: "SSOTA Labs" },
  { workspaceKey: "T02ACME-SEED", name: "Acme Product" },
] as const;

const SEED_DISCORD_WORKSPACE = {
  workspaceKey: "9876543210",
  name: "SSOTA Community",
  installationId: "discord-guild-seed",
} as const;

function resolveSlackConnector(): string {
  return (
    process.env.SLACK_CONNECT_CONNECTOR ??
    process.env.SLACK_MCP_CONNECTOR ??
    "slack/dev"
  );
}

function resolveDiscordConnector(): string {
  return (
    process.env.DISCORD_CONNECT_CONNECTOR ??
    process.env.DISCORD_MCP_CONNECTOR ??
    "discord/dev"
  );
}

/**
 * Demo inbound Slack/Discord workspaces for the builder `workspace` account so
 * Channels shows linked rows after `pnpm db:seed`.
 */
export async function seedInboundChannelFixtures(
  db: Db,
  teamspaceId: string,
): Promise<void> {
  const account = await createDbAccountReadPort(db).getOrCreateWorkspaceAccount(
    teamspaceId,
  );
  const connectionPort = createAccountConnectionPort(db);
  const workspacePort = createChatWorkspacePort(db);

  const slackConnector = resolveSlackConnector();
  const discordConnector = resolveDiscordConnector();

  for (const workspace of SEED_SLACK_WORKSPACES) {
    await connectionPort.record({
      teamspaceId,
      accountId: account.id,
      connector: slackConnector,
      installationId: workspace.workspaceKey,
      tenantId: workspace.workspaceKey,
      name: workspace.name,
    });
    await workspacePort.link({
      teamspaceId,
      accountId: account.id,
      platform: "slack",
      workspaceKey: workspace.workspaceKey,
      name: workspace.name,
    });
  }

  await connectionPort.record({
    teamspaceId,
    accountId: account.id,
    connector: discordConnector,
    installationId: SEED_DISCORD_WORKSPACE.installationId,
    tenantId: SEED_DISCORD_WORKSPACE.workspaceKey,
    name: SEED_DISCORD_WORKSPACE.name,
  });
  await workspacePort.link({
    teamspaceId,
    accountId: account.id,
    platform: "discord",
    workspaceKey: SEED_DISCORD_WORKSPACE.workspaceKey,
    name: SEED_DISCORD_WORKSPACE.name,
  });
}
