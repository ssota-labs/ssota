"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowClockwiseIcon,
  CheckCircleIcon,
  LinkBreakIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import { Badge } from "@ssota/ui/components/ui/badge";
import { Button, buttonVariants } from "@ssota/ui/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@ssota/ui/components/ui/alert-dialog";
import { BrowseWorkspace } from "@/components/console/browse-workspace";
import { ConnectorBrandIcon } from "@/components/connections/connector-brand-icon";
import { AgentSettingCard } from "@/components/console/agent-setting-card";
import { CardListSheet, CardListSheetPanel } from "@/components/card-list-sheet";
import { disconnectInboundChannelWorkspaceAction } from "@/app/[orgSlug]/[teamspaceSlug]/channels/actions";
import {
  inboundChannelAuthorizeHref,
  type InboundChannelPlatform,
  type InboundChannelStatus,
  type InboundChannelWorkspace,
} from "@/lib/connect/inbound-channels";

type ChannelsWorkspaceProps = {
  channels: InboundChannelStatus[];
  teamspaceId: string;
  accountId: string;
  returnTo: string;
};

function workspaceItemKey(workspace: InboundChannelWorkspace): string {
  return workspace.workspaceKey.replace(/[^a-zA-Z0-9_-]+/g, "-");
}

function channelCardSubtitle(channel: InboundChannelStatus): string {
  if (channel.workspaces.length > 0) {
    const first = channel.workspaces[0]!;
    const label = first.name ?? first.workspaceKey;
    if (channel.workspaces.length === 1) return label;
    return `${label} +${channel.workspaces.length - 1}`;
  }
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
  const [disconnectTarget, setDisconnectTarget] =
    useState<InboundChannelWorkspace | null>(null);
  const configured = channel.canConnect;
  const connectHref = inboundChannelAuthorizeHref({
    connectorUid: channel.connectorUid,
    teamspaceId,
    accountId,
    returnTo,
  });

  function confirmDisconnect() {
    if (!disconnectTarget) return;
    startTransition(async () => {
      await disconnectInboundChannelWorkspaceAction({
        teamspaceId,
        platform: channel.platform,
        workspaceId: disconnectTarget.id,
        connectionId: disconnectTarget.connectionId,
        revalidate: returnTo,
      });
      setDisconnectTarget(null);
      router.refresh();
      if (channel.workspaces.length <= 1) {
        onClose();
      }
    });
  }

  return (
    <>
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
            <AgentSettingCard.Root testId={`channel-workspaces-${channel.platform}`}>
              <AgentSettingCard.Header
                title="Workspaces"
                description={`Connected ${channel.label} workspaces for inbound @mentions.`}
              />
              <AgentSettingCard.Body>
                <AgentSettingCard.Items divided>
                  {channel.workspaces.length === 0 ? (
                    <AgentSettingCard.Empty>
                      No workspaces connected yet.
                    </AgentSettingCard.Empty>
                  ) : (
                    channel.workspaces.map((workspace) => {
                      const itemKey = workspaceItemKey(workspace);
                      const title = workspace.name ?? workspace.workspaceKey;
                      const subtitle =
                        workspace.status === "credential_only"
                          ? `${workspace.workspaceKey} · finish linking`
                          : workspace.workspaceKey;

                      return (
                        <AgentSettingCard.Item
                          key={workspace.id}
                          testId={`channel-workspace-${channel.platform}-${itemKey}`}
                          icon={
                            <ConnectorBrandIcon
                              provider={channel.platform}
                              className="size-3.5"
                            />
                          }
                          title={title}
                          subtitle={subtitle}
                          trailing={
                            <div className="flex items-center gap-1">
                              <a
                                href={connectHref}
                                className={buttonVariants({
                                  variant: "ghost",
                                  size: "icon-sm",
                                  className: "text-muted-foreground",
                                })}
                                data-testid={`channel-reconnect-${channel.platform}-${itemKey}`}
                                aria-label={`Reconnect ${title}`}
                              >
                                <ArrowClockwiseIcon className="size-4" />
                              </a>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={isPending}
                                className="text-muted-foreground hover:bg-destructive/10! hover:text-destructive! [&_svg]:text-current"
                                onClick={() => setDisconnectTarget(workspace)}
                                data-testid={`channel-disconnect-${channel.platform}-${itemKey}`}
                              >
                                <LinkBreakIcon className="size-4" />
                                Disconnect
                              </Button>
                            </div>
                          }
                        />
                      );
                    })
                  )}
                </AgentSettingCard.Items>
              </AgentSettingCard.Body>
              <AgentSettingCard.Footer>
                <a
                  className={buttonVariants({
                    variant: "secondary",
                    size: "sm",
                    className: "w-fit justify-start gap-2",
                  })}
                  href={connectHref}
                  data-testid={`channel-add-connection-${channel.platform}`}
                >
                  <PlusIcon className="size-4" />
                  Add connection
                </a>
              </AgentSettingCard.Footer>
            </AgentSettingCard.Root>
          )}
        </div>
      </CardListSheetPanel>

      <AlertDialog
        open={disconnectTarget !== null}
        onOpenChange={(open) => !open && setDisconnectTarget(null)}
      >
        <AlertDialogContent data-testid="channel-disconnect-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect workspace?</AlertDialogTitle>
            <AlertDialogDescription>
              {disconnectTarget
                ? `Disconnect ${disconnectTarget.name ?? disconnectTarget.workspaceKey} from this project. Agents will stop receiving inbound messages from this workspace until you connect it again.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="channel-disconnect-cancel">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              data-testid="channel-disconnect-confirm"
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={confirmDisconnect}
            >
              {isPending ? "Disconnecting…" : "Disconnect"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
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
          description="Connect Slack or Discord so agents can receive inbound messages and @mentions."
        />
        <BrowseWorkspace.Grid>
          {channels.map((channel) => (
            <InboundChannelBrowseCard
              key={channel.platform}
              channel={channel}
              onSelect={() => setActiveId(channel.platform)}
            />
          ))}
        </BrowseWorkspace.Grid>
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
