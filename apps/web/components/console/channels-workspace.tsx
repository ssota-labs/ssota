"use client";

import { useState } from "react";
import { CheckCircleIcon, PlusIcon } from "@phosphor-icons/react";
import { Badge } from "@ssota/ui/components/ui/badge";
import { buttonVariants } from "@ssota/ui/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@ssota/ui/components/ui/sheet";
import { BrowseWorkspace } from "@/components/console/browse-workspace";
import { ConnectorBrandIcon } from "@/components/connections/connector-brand-icon";
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

function InboundChannelSettings({
  channel,
  connectHref,
}: {
  channel: InboundChannelStatus;
  connectHref: string;
}) {
  const configured = channel.canConnect;

  return (
    <>
      <SheetHeader className="gap-3 border-b px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
            <ConnectorBrandIcon provider={channel.platform} className="size-5" />
          </span>
          <div className="min-w-0">
            <SheetTitle className="text-base">{channel.label}</SheetTitle>
            <SheetDescription className="text-xs">
              {channel.description}
            </SheetDescription>
          </div>
        </div>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto px-5 py-4">
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
          <div className="space-y-4">
            {channel.workspaceLinked ? (
              <div
                className="rounded-lg border bg-background px-3 py-2"
                data-testid={`channel-workspace-${channel.platform}`}
              >
                <p className="text-sm font-medium">
                  {channel.workspaceName ?? channel.workspaceKey}
                </p>
                {channel.workspaceName && channel.workspaceKey ? (
                  <p className="text-muted-foreground font-mono text-xs">
                    {channel.workspaceKey}
                  </p>
                ) : null}
              </div>
            ) : channel.credentialConnected ? (
              <p className="text-muted-foreground text-sm">
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
          </div>
        )}
      </div>
    </>
  );
}

export function ChannelsWorkspace({
  channels,
  teamspaceId,
  accountId,
  returnTo,
}: ChannelsWorkspaceProps) {
  const [selected, setSelected] = useState<InboundChannelPlatform | null>(null);

  const selectedChannel = selected
    ? (channels.find((row) => row.platform === selected) ?? null)
    : null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <BrowseWorkspace.Frame testId="channels-workspace">
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
                onSelect={() => setSelected(channel.platform)}
              />
            ))}
          </BrowseWorkspace.Grid>
        </BrowseWorkspace.Section>
      </BrowseWorkspace.Frame>

      <Sheet
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <SheetContent side="right" className="flex flex-col gap-0 p-0">
          {selectedChannel ? (
            <InboundChannelSettings
              channel={selectedChannel}
              connectHref={inboundChannelAuthorizeHref({
                connectorUid: selectedChannel.connectorUid,
                teamspaceId,
                accountId,
                returnTo,
              })}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
