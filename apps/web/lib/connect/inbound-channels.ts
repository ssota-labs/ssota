/**
 * Inbound chat channels (Slack, Discord) use Vercel Connect — separate from Composio
 * tool connections on the Connections page. Kakao has no OAuth (no `/`
 * connectorUid, so `canConnect` is false) — its workspace is linked by
 * manually entering the Kakao Open Builder bot id instead.
 */

export type InboundChannelPlatform = "slack" | "discord" | "kakao";

export type InboundChannelWorkspaceLinkStatus = "linked" | "credential_only";

/** One connected inbound workspace (Slack team, Discord guild, …). */
export type InboundChannelWorkspace = {
  /** `chat_workspaces.id` when linked; `credential:{connectionId}` for orphan creds. */
  id: string;
  workspaceKey: string;
  name: string | null;
  connectionId: string | null;
  status: InboundChannelWorkspaceLinkStatus;
};

export type InboundChannelStatus = {
  platform: InboundChannelPlatform;
  label: string;
  description: string;
  connectorUid: string;
  canConnect: boolean;
  credentialConnected: boolean;
  workspaceLinked: boolean;
  workspaceKey: string | null;
  workspaceName: string | null;
  ready: boolean;
  workspaces: InboundChannelWorkspace[];
};

export function inboundChannelStatusFor(
  statuses: InboundChannelStatus[],
  platform: InboundChannelPlatform,
): InboundChannelStatus | undefined {
  return statuses.find((row) => row.platform === platform);
}

export type InboundChannelDef = {
  platform: InboundChannelPlatform;
  label: string;
  description: string;
  /** Vercel Connect connector uid (must include `/`, e.g. `slack/ssota`). */
  connectorUid: string;
};

function resolveInboundConnectorUid(
  platform: InboundChannelPlatform,
): string {
  if (platform === "slack") {
    return (
      process.env.SLACK_CONNECT_CONNECTOR ??
      process.env.SLACK_MCP_CONNECTOR ??
      "slack"
    );
  }
  if (platform === "kakao") {
    // No `/` — keeps isVercelConnectChannelUid() false (no OAuth for Kakao).
    return "kakao";
  }
  return (
    process.env.DISCORD_CONNECT_CONNECTOR ??
    process.env.DISCORD_MCP_CONNECTOR ??
    "discord"
  );
}

const INBOUND_CHANNEL_COPY: Record<
  InboundChannelPlatform,
  Pick<InboundChannelDef, "label" | "description">
> = {
  slack: {
    label: "Slack",
    description:
      "Receive @mentions and post replies in your Slack workspace (inbound bot).",
  },
  discord: {
    label: "Discord",
    description:
      "Receive messages and post replies in your Discord server (inbound bot).",
  },
  kakao: {
    label: "Kakao",
    description:
      "Auto-reply from a Kakao Channel via an Open Builder fallback-block skill (no OAuth — link your bot id manually).",
  },
};

export function isVercelConnectChannelUid(connectorUid: string): boolean {
  return connectorUid.includes("/");
}

export function providerOfInboundChannel(connectorUid: string): string {
  return connectorUid.split("/")[0] ?? connectorUid;
}

/** Inbound platforms exposed on the Channels page. */
export function getInboundChannels(): InboundChannelDef[] {
  const platforms: InboundChannelPlatform[] = ["slack", "discord"];
  if (process.env.KAKAO_SKILL_ENABLED === "1") platforms.push("kakao");
  return platforms.map((platform) => ({
    platform,
    ...INBOUND_CHANNEL_COPY[platform],
    connectorUid: resolveInboundConnectorUid(platform),
  }));
}

export function inboundChannelAuthorizeHref(params: {
  connectorUid: string;
  teamspaceId: string;
  accountId: string;
  returnTo: string;
}): string {
  const search = new URLSearchParams({
    connector: params.connectorUid,
    accountId: params.accountId,
    teamspaceId: params.teamspaceId,
    returnTo: params.returnTo,
    purpose: "inbound",
  });
  return `/api/connect/authorize?${search.toString()}`;
}
