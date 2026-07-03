import { createAccountConnectionPort } from "@ssota/adapter-postgres";
import { getDb } from "@ssota/agent-runtime";
import {
  getInboundChannels,
  isVercelConnectChannelUid,
  providerOfInboundChannel,
  type InboundChannelStatus,
} from "@/lib/connect/inbound-channels";
import { getChatWorkspacePort, getOrCreateProjectAccount } from "@/lib/ports";

export type { InboundChannelStatus } from "@/lib/connect/inbound-channels";

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
