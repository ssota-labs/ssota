"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircleIcon,
  LinkBreakIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import { Badge } from "@ssota/ui/components/ui/badge";
import { Button, buttonVariants } from "@ssota/ui/components/ui/button";
import { BrowseWorkspace } from "@/components/console/browse-workspace";
import { ConnectorBrandIcon } from "@/components/connections/connector-brand-icon";
import { CardListSheet, CardListSheetPanel } from "@/components/card-list-sheet";
import { disconnectInboundChannelAction } from "@/app/[orgSlug]/[teamspaceSlug]/channels/actions";
import {
  inboundChannelAuthorizeHref,
  type InboundChannelPlatform,
  type InboundChannelStatus,
} from "@/lib/connect/inbound-channels";

type ChannelsWorkspaceProps = {
  channels: InboundChannelStatus[];
  teamspaceId: string;
  accountId: string;
  returnTo: string;
};

function channelCardSubtitle(channel: InboundChannelStatus): string {
  if (channel.ready && channel.workspaceName) {
    return channel.workspaceName;
  }
  if (channel.ready && channel.workspaceKey) {
    return channel.workspaceKey;
  }
  return channel.description;
}

function InboundChannelBrowseCard({
  channel,
  onSelect,
}: {
  channel: InboundChannelStatus;
  onSelect: () => void;
}) {
  const connected = channel.ready;
  const configured = channel.canConnect;

  return (
    <BrowseWorkspace.Card
      title={channel.label}
      subtitle={channelCardSubtitle(channel)}
      highlighted={connected}
      onSelect={onSelect}
      testId={`channel-card-${channel.platform}`}
      icon={
        <ConnectorBrandIcon
          provider={channel.platform}
          className="size-5"
        />
      }
      badge={
        connected ? (
          <Badge variant="secondary" className="shrink-0 gap-1 font-normal">
            <CheckCircleIcon weight="fill" className="size-3 text-primary" />
            Connected
          </Badge>
        ) : channel.credentialConnected ? (
          <Badge variant="outline" className="shrink-0 font-normal text-muted-foreground">
            Linking…
          </Badge>
        ) : !configured ? (
          <Badge variant="outline" className="shrink-0 font-normal text-muted-foreground">
            Off
          </Badge>
        ) : null
      }
    />
  );
}

function InboundChannelSettingsPanel({
  channel,
  teamspaceId,
  accountId,
  returnTo,
  onClose,
}: {
  channel: InboundChannelStatus;
  teamspaceId: string;
  accountId: string;
  returnTo: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const configured = channel.canConnect;
  const connectHref = inboundChannelAuthorizeHref({
    connectorUid: channel.connectorUid,
    teamspaceId,
    accountId,
    returnTo,
  });
  const canDisconnect =
    channel.credentialConnected || channel.workspaceLinked || channel.ready;

  function disconnect() {
    startTransition(async () => {
      await disconnectInboundChannelAction({
        teamspaceId,
        platform: channel.platform,
        revalidate: returnTo,
      });
      router.refresh();
      onClose();
    });
  }

  return (
    <CardListSheetPanel
      title={channel.label}
      subtitle={channel.description}
      sheetSize="inspector"
      onClose={onClose}
      headerPrefix={
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
          <ConnectorBrandIcon provider={channel.platform} className="size-5" />
        </span>
      }
    >
      <div className="space-y-4" data-testid={`channel-detail-${channel.platform}`}>
        {!configured ? (
          <p className="rounded-md border border-dashed bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground">
            Set{" "}
            <span className="font-mono">
              {channel.platform === "slack"
                ? "SLACK_CONNECT_CONNECTOR"
                : "DISCORD_CONNECT_CONNECTOR"}
            </span>{" "}
            to a Vercel Connect uid (e.g.{" "}
            <span className="font-mono">{channel.platform}/ssota</span>) so
            inbound OAuth can start.
          </p>
        ) : (
          <>
            {channel.workspaceLinked ? (
              <div
                className="rounded-lg border bg-background px-3 py-2"
                data-testid={`channel-workspace-${channel.platform}`}
              >
                <p className="text-sm font-medium">
                  {channel.workspaceName ?? channel.workspaceKey}
                </p>
                {channel.workspaceName && channel.workspaceKey ? (
                  <p className="font-mono text-xs text-muted-foreground">
                    {channel.workspaceKey}
                  </p>
                ) : null}
              </div>
            ) : channel.credentialConnected ? (
              <p className="text-sm text-muted-foreground">
                Credential saved — finish OAuth or refresh if routing does not
                appear.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Connect your {channel.label} workspace so agents can receive
                inbound @mentions and post replies. This uses Vercel Connect on
                Channels — not the Composio card on Connections.
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              {!channel.ready ? (
                <a
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                  href={connectHref}
                  data-testid={`channel-connect-${channel.platform}`}
                >
                  <PlusIcon className="size-4" />
                  Connect
                </a>
              ) : null}

              {canDisconnect ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  className="text-muted-foreground hover:bg-destructive/10! hover:text-destructive! [&_svg]:text-current"
                  onClick={disconnect}
                  data-testid={`channel-disconnect-${channel.platform}`}
                >
                  <LinkBreakIcon className="size-4" />
                  {isPending ? "Disconnecting…" : "Disconnect"}
                </Button>
              ) : null}
            </div>
          </>
        )}
      </div>
    </CardListSheetPanel>
  );
}

export function ChannelsWorkspace({
  channels,
  teamspaceId,
  accountId,
  returnTo,
}: ChannelsWorkspaceProps) {
  const [activeId, setActiveId] = useState<InboundChannelPlatform | null>(null);

  const activeChannel = activeId
    ? (channels.find((row) => row.platform === activeId) ?? null)
    : null;

  return (
    <CardListSheet.Root
      activeId={activeId}
      onActiveIdChange={(id) => setActiveId(id as InboundChannelPlatform | null)}
      dismissOnOutsideClick
      className="absolute inset-0 flex flex-col"
      testId="channels-workspace"
    >
      <BrowseWorkspace.Frame>
        <BrowseWorkspace.Header
          title="Channels"
          description="Connect Slack or Discord so agents can receive inbound messages. Agent tools (search, post via Composio) stay on the Connections page."
        />
        <BrowseWorkspace.Section label="Inbound channels">
          <BrowseWorkspace.Grid>
            {channels.map((channel) => (
              <InboundChannelBrowseCard
                key={channel.platform}
                channel={channel}
                onSelect={() => setActiveId(channel.platform)}
              />
            ))}
          </BrowseWorkspace.Grid>
        </BrowseWorkspace.Section>
      </BrowseWorkspace.Frame>

      {activeChannel ? (
        <InboundChannelSettingsPanel
          channel={activeChannel}
          teamspaceId={teamspaceId}
          accountId={accountId}
          returnTo={returnTo}
          onClose={() => setActiveId(null)}
        />
      ) : null}
    </CardListSheet.Root>
  );
}
