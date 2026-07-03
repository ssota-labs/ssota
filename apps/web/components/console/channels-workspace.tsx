"use client";

import {
  DiscordLogoIcon,
  SlackLogoIcon,
} from "@phosphor-icons/react";
import { Badge } from "@ssota/ui/components/ui/badge";
import { Button } from "@ssota/ui/components/ui/button";
import { cn } from "@ssota/ui/lib/utils";
import { BrowseWorkspace } from "@/components/console/browse-workspace";
import {
  connectorCardDescriptionClassName,
  connectorCardTextClassName,
  connectorCardTitleClassName,
  connectorIconWrapClassName,
} from "@/components/connectors/connector-card-styles";
import {
  inboundChannelAuthorizeHref,
  type InboundChannelPlatform,
} from "@/lib/connect/inbound-channels";
import type { InboundChannelStatus } from "@/lib/connect/inbound-channels";

const PLATFORM_ICONS = {
  slack: SlackLogoIcon,
  discord: DiscordLogoIcon,
} satisfies Record<InboundChannelPlatform, typeof SlackLogoIcon>;

type ChannelsWorkspaceProps = {
  channels: InboundChannelStatus[];
  teamspaceId: string;
  accountId: string;
  returnTo: string;
};

export function ChannelsWorkspace({
  channels,
  teamspaceId,
  accountId,
  returnTo,
}: ChannelsWorkspaceProps) {
  return (
    <BrowseWorkspace.Frame testId="channels-workspace">
      <BrowseWorkspace.Header
        title="Channels"
        description="Connect Slack or Discord so agents can receive inbound messages. Agent tools (search, post via Composio) stay on the Connections page."
      />
      <BrowseWorkspace.Section label="Inbound channels">
        <BrowseWorkspace.Grid columns="two">
          {channels.map((channel) => {
            const Icon = PLATFORM_ICONS[channel.platform];
            const connectHref = inboundChannelAuthorizeHref({
              connectorUid: channel.connectorUid,
              teamspaceId,
              accountId,
              returnTo,
            });

            return (
              <div
                key={channel.platform}
                data-testid={`channel-card-${channel.platform}`}
                className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card/40 p-4"
              >
                <div className="flex items-start gap-3">
                  <span className={connectorIconWrapClassName}>
                    <Icon className="size-4" />
                  </span>
                  <span className={cn(connectorCardTextClassName, "min-w-0 flex-1")}>
                    <span className={connectorCardTitleClassName}>
                      {channel.label}
                    </span>
                    <span className={connectorCardDescriptionClassName}>
                      {channel.platform}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {channel.description}
                    </span>
                  </span>
                  {channel.ready ? (
                    <Badge variant="secondary">Connected</Badge>
                  ) : channel.credentialConnected ? (
                    <Badge variant="outline">Linking…</Badge>
                  ) : (
                    <Badge variant="outline">Not connected</Badge>
                  )}
                </div>

                {channel.workspaceLinked ? (
                  <p className="text-muted-foreground font-mono text-xs">
                    {channel.workspaceName ?? channel.workspaceKey}
                    {channel.workspaceName && channel.workspaceKey
                      ? ` · ${channel.workspaceKey}`
                      : null}
                  </p>
                ) : channel.credentialConnected ? (
                  <p className="text-muted-foreground text-xs">
                    Credential saved — finish OAuth or refresh if routing does not
                    appear.
                  </p>
                ) : null}

                {!channel.ready ? (
                  channel.canConnect ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="w-fit"
                      render={
                        <a
                          href={connectHref}
                          data-testid={`channel-connect-${channel.platform}`}
                        />
                      }
                    >
                      Connect {channel.label}
                    </Button>
                  ) : (
                    <p className="text-muted-foreground text-xs">
                      Set{" "}
                      <span className="font-mono">
                        {channel.platform === "slack"
                          ? "SLACK_CONNECT_CONNECTOR"
                          : "DISCORD_CONNECT_CONNECTOR"}
                      </span>{" "}
                      to a Vercel Connect uid (e.g.{" "}
                      <span className="font-mono">{channel.platform}/ssota</span>
                      ).
                    </p>
                  )
                ) : null}
              </div>
            );
          })}
        </BrowseWorkspace.Grid>
      </BrowseWorkspace.Section>
    </BrowseWorkspace.Frame>
  );
}
