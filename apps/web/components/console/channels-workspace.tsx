"use client";

import {
  ChatsCircleIcon,
  DiscordLogoIcon,
  SlackLogoIcon,
  TelegramLogoIcon,
} from "@phosphor-icons/react";
import { Badge } from "@ssota/ui/components/ui/badge";
import { BrowseWorkspace } from "@/components/console/browse-workspace";

type ChannelRow = {
  id: string;
  platform: string;
  workspaceKey: string;
  name: string | null;
};

const PLATFORM_ICONS: Record<string, typeof ChatsCircleIcon> = {
  slack: SlackLogoIcon,
  discord: DiscordLogoIcon,
  telegram: TelegramLogoIcon,
};

type ChannelsWorkspaceProps = {
  linked: ChannelRow[];
};

export function ChannelsWorkspace({ linked }: ChannelsWorkspaceProps) {
  const planned = [
    { key: "slack", label: "Slack", description: "Team chat and approvals" },
    { key: "discord", label: "Discord", description: "Community and support bots" },
    { key: "telegram", label: "Telegram", description: "Lightweight chat channel" },
    { key: "web", label: "Web chat", description: "Built-in console threads (/c)" },
  ];

  return (
    <BrowseWorkspace.Frame testId="channels-workspace">
      <BrowseWorkspace.Header
        title="Channels"
        description="Surfaces where agents receive messages — Slack, Discord, Telegram, and web chat."
      />
      <BrowseWorkspace.Section label="Linked workspaces">
        {linked.length > 0 ? (
          <BrowseWorkspace.Grid columns="two">
            {linked.map((row) => {
              const Icon = PLATFORM_ICONS[row.platform] ?? ChatsCircleIcon;
              return (
                <BrowseWorkspace.Card
                  key={row.id}
                  title={row.name ?? row.workspaceKey}
                  subtitle={row.platform}
                  description={row.workspaceKey}
                  icon={<Icon className="size-4" />}
                  badge={<Badge variant="secondary">Linked</Badge>}
                  onSelect={() => {}}
                  className="cursor-default"
                />
              );
            })}
          </BrowseWorkspace.Grid>
        ) : (
          <BrowseWorkspace.Empty>
            No external chat workspaces linked yet. Connect Slack or Discord from Developer
            settings, or use web chat in the sidebar.
          </BrowseWorkspace.Empty>
        )}
      </BrowseWorkspace.Section>
      <BrowseWorkspace.Section label="Supported channels">
        <BrowseWorkspace.Grid columns="two">
          {planned.map((channel) => {
            const Icon = PLATFORM_ICONS[channel.key] ?? ChatsCircleIcon;
            return (
              <BrowseWorkspace.Card
                key={channel.key}
                title={channel.label}
                description={channel.description}
                icon={<Icon className="size-4" />}
                onSelect={() => {}}
                className="cursor-default"
              />
            );
          })}
        </BrowseWorkspace.Grid>
      </BrowseWorkspace.Section>
    </BrowseWorkspace.Frame>
  );
}
