import { createAccountConnectionPort } from "@ssota/adapter-postgres";
import { getDb } from "@ssota/agent-runtime";
import {
  getInboundChannels,
  isVercelConnectChannelUid,
  providerOfInboundChannel,
  type InboundChannelPlatform,
} from "@/lib/connect/inbound-channels";
import { getChatWorkspacePort, getOrCreateProjectAccount } from "@/lib/ports";

export type InboundChannelStatus = {
  platform: InboundChannelPlatform;
  label: string;
  description: string;
  connectorUid: string;
  /** Whether authorize can use Vercel Connect (connector uid includes `/`). */
  canConnect: boolean;
  /** Vercel Connect install recorded in `account_connections`, or static Slack token. */
  credentialConnected: boolean;
  /** `chat_workspaces` row exists for this teamspace + platform. */
  workspaceLinked: boolean;
  workspaceKey: string | null;
  workspaceName: string | null;
  /** Credential + workspace link — required for inbound routing and Slack triggers. */
  ready: boolean;
};

function slackUsesStaticToken(): boolean {
  return (
    process.env.SLACK_CONNECT === "0" || Boolean(process.env.SLACK_BOT_TOKEN)
  );
}

export async function loadInboundChannelStatus(
  teamspaceId: string,
): Promise<InboundChannelStatus[]> {
  const account = await getOrCreateProjectAccount(teamspaceId);
  const db = getDb();
  const [scopes, linked] = await Promise.all([
    createAccountConnectionPort(db).listConnectCredentialScopes(account.id),
    getChatWorkspacePort().list(teamspaceId),
  ]);

  return getInboundChannels().map((channel) => {
    const credential = scopes.find(
      (scope) =>
        providerOfInboundChannel(scope.connector) === channel.platform,
    );
    const workspace = linked.find((row) => row.platform === channel.platform);

    const credentialConnected =
      channel.platform === "slack" && slackUsesStaticToken()
        ? true
        : Boolean(credential);

    const workspaceLinked = Boolean(workspace);
    const ready = credentialConnected && workspaceLinked;

    return {
      platform: channel.platform,
      label: channel.label,
      description: channel.description,
      connectorUid: channel.connectorUid,
      canConnect: isVercelConnectChannelUid(channel.connectorUid),
      credentialConnected,
      workspaceLinked,
      workspaceKey: workspace?.workspaceKey ?? null,
      workspaceName: workspace?.name ?? null,
      ready,
    };
  });
}

export function inboundChannelStatusFor(
  statuses: InboundChannelStatus[],
  platform: InboundChannelPlatform,
): InboundChannelStatus | undefined {
  return statuses.find((row) => row.platform === platform);
}
