import {
  createAccountConnectionPort,
  type AccountConnectionRecord,
  type ChatWorkspaceRow,
} from "@ssota/adapter-postgres";
import { getDb } from "@ssota/agent-runtime";
import {
  getInboundChannels,
  isVercelConnectChannelUid,
  providerOfInboundChannel,
  type InboundChannelPlatform,
  type InboundChannelStatus,
  type InboundChannelWorkspace,
} from "@/lib/connect/inbound-channels";
import { getChatWorkspacePort, getOrCreateProjectAccount } from "@/lib/ports";

export type { InboundChannelStatus } from "@/lib/connect/inbound-channels";

function slackUsesStaticToken(): boolean {
  return (
    process.env.SLACK_CONNECT === "0" || Boolean(process.env.SLACK_BOT_TOKEN)
  );
}

function connectionWorkspaceKey(conn: AccountConnectionRecord): string | null {
  const installation = conn.installationId?.trim();
  if (installation && installation.toLowerCase() !== "empty") {
    return installation;
  }
  return conn.tenantId ?? null;
}

function connectionMatchesWorkspace(
  conn: AccountConnectionRecord,
  workspaceKey: string,
): boolean {
  return (
    conn.tenantId === workspaceKey || connectionWorkspaceKey(conn) === workspaceKey
  );
}

export function buildInboundChannelWorkspaces(
  platform: InboundChannelPlatform,
  connections: AccountConnectionRecord[],
  workspaces: ChatWorkspaceRow[],
): InboundChannelWorkspace[] {
  const platformConnections = connections.filter(
    (row) => providerOfInboundChannel(row.connector) === platform,
  );
  const platformWorkspaces = workspaces.filter((row) => row.platform === platform);
  const items: InboundChannelWorkspace[] = [];
  const usedConnectionIds = new Set<string>();

  for (const workspace of platformWorkspaces) {
    const connection = platformConnections.find((row) =>
      connectionMatchesWorkspace(row, workspace.workspaceKey),
    );
    if (connection) usedConnectionIds.add(connection.id);
    items.push({
      id: workspace.id,
      workspaceKey: workspace.workspaceKey,
      name: workspace.name,
      connectionId: connection?.id ?? null,
      status: "linked",
    });
  }

  for (const connection of platformConnections) {
    if (usedConnectionIds.has(connection.id)) continue;
    const workspaceKey = connectionWorkspaceKey(connection);
    if (!workspaceKey) continue;
    items.push({
      id: `credential:${connection.id}`,
      workspaceKey,
      name: connection.name,
      connectionId: connection.id,
      status: "credential_only",
    });
  }

  return items;
}

export async function loadInboundChannelStatus(
  teamspaceId: string,
): Promise<InboundChannelStatus[]> {
  const account = await getOrCreateProjectAccount(teamspaceId);
  const db = getDb();
  const connectionPort = createAccountConnectionPort(db);
  const [connections, linked] = await Promise.all([
    connectionPort.list(account.id),
    getChatWorkspacePort().list(teamspaceId),
  ]);

  return getInboundChannels().map((channel) => {
    const workspaces = buildInboundChannelWorkspaces(
      channel.platform,
      connections,
      linked,
    );
    const linkedWorkspaces = workspaces.filter((row) => row.status === "linked");
    const primary = linkedWorkspaces[0] ?? workspaces[0];

    const credentialConnected =
      (channel.platform === "slack" && slackUsesStaticToken()) ||
      channel.platform === "kakao" // no OAuth credential to obtain
        ? true
        : workspaces.some((row) => row.connectionId) ||
          connections.some(
            (row) => providerOfInboundChannel(row.connector) === channel.platform,
          );

    const workspaceLinked = linkedWorkspaces.length > 0;
    const ready =
      workspaceLinked &&
      (credentialConnected ||
        workspaces.some((row) => row.status === "linked" && row.connectionId));

    return {
      platform: channel.platform,
      label: channel.label,
      description: channel.description,
      connectorUid: channel.connectorUid,
      canConnect: isVercelConnectChannelUid(channel.connectorUid),
      credentialConnected,
      workspaceLinked,
      workspaceKey: primary?.workspaceKey ?? null,
      workspaceName: primary?.name ?? null,
      ready,
      workspaces,
    };
  });
}
