"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  ArrowClockwiseIcon,
  ArrowLeftIcon,
  BuildingsIcon,
  CheckCircleIcon,
  LinkBreakIcon,
  PlusIcon,
  UserIcon,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { Badge } from "@ssota/ui/components/ui/badge";
import { Button, buttonVariants } from "@ssota/ui/components/ui/button";
import { Switch } from "@ssota/ui/components/ui/switch";
import { BrowseWorkspace } from "@/components/console/browse-workspace";
import { AgentSettingCard } from "@/components/console/agent-setting-card";
import { CardListSheet, CardListSheetPanel } from "@/components/card-list-sheet";
import { useLocale } from "@/components/i18n/locale-provider";
import { ConnectorBrandIcon } from "@/components/connections/connector-brand-icon";
import {
  disconnectConnectionAction,
  loadToolkitToolSettingsAction,
  setToolkitDisabledAction,
} from "@/app/[orgSlug]/[teamspaceSlug]/connections/actions";
import {
  CONNECTOR_THEMES,
  type ConnectorDef,
  type ConnectorProvider,
} from "@/lib/connect/connectors";
import {
  buildConnectorAuthorizeHref,
  type ConnectorConnectScope,
} from "@/lib/connect/authorize-href";

export interface ConnectorConnection {
  /** Composio connected-account id (used to disconnect). */
  id: string;
  /** Toolkit slug — matches ConnectorDef.provider. */
  connector: string;
  name: string | null;
}

/** Connections bucketed by scope. */
export interface ScopedConnections {
  user: ConnectorConnection[];
  org: ConnectorConnection[];
}

type Scope = ConnectorConnectScope;

const SCOPE_META: Record<Scope, { title: string; subtitle: string; icon: Icon }> = {
  user: {
    title: "You",
    subtitle: "Personal — only your runs use this connection.",
    icon: UserIcon,
  },
  org: {
    title: "Organization",
    subtitle: "Shared — everyone in the org can use this connection.",
    icon: BuildingsIcon,
  },
};

interface ConnectorsViewProps {
  connectors: ConnectorDef[];
  connections: ScopedConnections;
  teamspaceId: string;
  accountId: string;
  returnTo: string;
  /** Show the org-shared scope (builder console). End-user app shows personal only. */
  allowOrgScope: boolean;
}

export function ConnectorsView({
  connectors,
  connections,
  teamspaceId,
  accountId,
  returnTo,
  allowOrgScope,
}: ConnectorsViewProps) {
  const { t } = useLocale();
  const [selected, setSelected] = useState<ConnectorProvider | null>(null);

  const byProvider = useMemo(() => {
    const map = new Map<string, { user: ConnectorConnection[]; org: ConnectorConnection[] }>();
    const add = (scope: Scope, list: ConnectorConnection[]) => {
      for (const c of list) {
        const entry = map.get(c.connector) ?? { user: [], org: [] };
        entry[scope].push(c);
        map.set(c.connector, entry);
      }
    };
    add("user", connections.user);
    add("org", connections.org);
    return map;
  }, [connections]);

  const groups = useMemo(
    () =>
      CONNECTOR_THEMES.map((theme) => ({
        theme,
        items: connectors.filter((c) => c.theme === theme),
      })).filter((g) => g.items.length > 0),
    [connectors],
  );

  const selectedConnector = selected
    ? (connectors.find((c) => c.provider === selected) ?? null)
    : null;
  const selectedScoped = selected
    ? (byProvider.get(selected) ?? { user: [], org: [] })
    : { user: [], org: [] };

  return (
    <CardListSheet.Root
      activeId={selected}
      onActiveIdChange={(id) => setSelected(id as ConnectorProvider | null)}
      dismissOnOutsideClick
      className="absolute inset-0 flex flex-col"
      testId="connections-workspace"
    >
      <BrowseWorkspace.Frame>
        <BrowseWorkspace.Header
          title={t("nav.connections")}
          description={t("connections.description")}
        />

        {groups.map((group) => (
          <BrowseWorkspace.Section key={group.theme} label={group.theme}>
            <BrowseWorkspace.Grid>
              {group.items.map((connector) => {
                const entry = byProvider.get(connector.provider);
                const connected =
                  (entry?.user.length ?? 0) + (entry?.org.length ?? 0) > 0;
                return (
                  <ConnectorBrowseCard
                    key={connector.provider}
                    connector={connector}
                    connected={connected}
                    onSelect={() => setSelected(connector.provider)}
                  />
                );
              })}
            </BrowseWorkspace.Grid>
          </BrowseWorkspace.Section>
        ))}
      </BrowseWorkspace.Frame>

      {selectedConnector ? (
        <ConnectorSettingsPanel
          connector={selectedConnector}
          userConnections={selectedScoped.user}
          orgConnections={selectedScoped.org}
          allowOrgScope={allowOrgScope}
          teamspaceId={teamspaceId}
          accountId={accountId}
          returnTo={returnTo}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </CardListSheet.Root>
  );
}

export function ConnectorBrowseCard({
  connector,
  connected,
  onSelect,
  interactive = true,
  connectedBadgeLabel = "Connected",
  offBadgeLabel = "Off",
}: {
  connector: ConnectorDef;
  connected: boolean;
  onSelect: () => void;
  interactive?: boolean;
  connectedBadgeLabel?: string;
  offBadgeLabel?: string;
}) {
  const configured = Boolean(connector.connectorUid);
  return (
    <BrowseWorkspace.Card
      title={connector.label}
      subtitle={connector.description}
      highlighted={connected}
      onSelect={onSelect}
      testId={`connector-${connector.provider}`}
      className={interactive ? undefined : "pointer-events-none"}
      icon={
        <ConnectorBrandIcon provider={connector.provider} className="size-5" />
      }
      badge={
        connected ? (
          <Badge variant="secondary" className="shrink-0 gap-1 font-normal">
            <CheckCircleIcon weight="fill" className="size-3 text-primary" />
            {connectedBadgeLabel}
          </Badge>
        ) : !configured ? (
          <Badge variant="outline" className="shrink-0 font-normal text-muted-foreground">
            {offBadgeLabel}
          </Badge>
        ) : null
      }
    />
  );
}

function ConnectorSettingsPanel({
  connector,
  userConnections,
  orgConnections,
  allowOrgScope,
  teamspaceId,
  accountId,
  returnTo,
  onClose,
}: {
  connector: ConnectorDef;
  userConnections: ConnectorConnection[];
  orgConnections: ConnectorConnection[];
  allowOrgScope: boolean;
  teamspaceId: string;
  accountId: string;
  returnTo: string;
  onClose: () => void;
}) {
  const configured = Boolean(connector.connectorUid);
  const scopes: Scope[] = allowOrgScope ? ["user", "org"] : ["user"];
  const [scope, setScope] = useState<Scope | null>(
    scopes.length === 1 ? "user" : null,
  );

  useEffect(() => {
    setScope(scopes.length === 1 ? "user" : null);
  }, [connector.provider, scopes.length]);

  const connectionsFor = (s: Scope) =>
    s === "user" ? userConnections : orgConnections;

  return (
    <CardListSheetPanel
      title={connector.label}
      subtitle={connector.description}
      onClose={onClose}
      testId={`connector-detail-${connector.provider}`}
      headerPrefix={
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
          <ConnectorBrandIcon provider={connector.provider} className="size-5" />
        </span>
      }
      headerAction={
        scope !== null && scopes.length > 1 ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Back"
            onClick={() => setScope(null)}
            className="shrink-0"
          >
            <ArrowLeftIcon className="size-4" />
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-4" data-testid={`connection-detail-${connector.provider}`}>
        {!configured ? (
          <p className="rounded-md border border-dashed bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground">
            This connector is not configured for this deployment.
          </p>
        ) : scope === null ? (
          <ScopeList
            scopes={scopes}
            connectionsFor={connectionsFor}
            onSelect={setScope}
          />
        ) : (
          <ScopeDetail
            connector={connector}
            scope={scope}
            connections={connectionsFor(scope)}
            teamspaceId={teamspaceId}
            accountId={accountId}
            returnTo={returnTo}
          />
        )}
      </div>
    </CardListSheetPanel>
  );
}

function ScopeList({
  scopes,
  connectionsFor,
  onSelect,
}: {
  scopes: Scope[];
  connectionsFor: (s: Scope) => ConnectorConnection[];
  onSelect: (s: Scope) => void;
}) {
  return (
    <AgentSettingCard.Root testId="connection-scope-list">
      <AgentSettingCard.Header
        title="Access scope"
        description="Who this connection applies to and which tools the agent may use."
      />
      <AgentSettingCard.Body>
        <AgentSettingCard.Items divided>
          {scopes.map((s) => {
            const meta = SCOPE_META[s];
            const ScopeIcon = meta.icon;
            const count = connectionsFor(s).length;
            return (
              <AgentSettingCard.Item
                key={s}
                testId={`scope-${s}`}
                onPress={() => onSelect(s)}
                icon={
                  <ScopeIcon className="size-3.5 text-muted-foreground" />
                }
                title={meta.title}
                subtitle={meta.subtitle}
                trailing={
                  <div className="flex items-center gap-2">
                    {count > 0 ? (
                      <Badge variant="secondary" className="shrink-0 gap-1 font-normal">
                        <CheckCircleIcon
                          weight="fill"
                          className="size-3 text-primary"
                        />
                        {count}
                      </Badge>
                    ) : null}
                    <AgentSettingCard.ItemCaret />
                  </div>
                }
              />
            );
          })}
        </AgentSettingCard.Items>
      </AgentSettingCard.Body>
    </AgentSettingCard.Root>
  );
}

function ScopeDetail({
  connector,
  scope,
  connections,
  teamspaceId,
  accountId,
  returnTo,
}: {
  connector: ConnectorDef;
  scope: Scope;
  connections: ConnectorConnection[];
  teamspaceId: string;
  accountId: string;
  returnTo: string;
}) {
  const [isPending, startTransition] = useTransition();
  const meta = SCOPE_META[scope];
  const connected = connections.length > 0;
  const href = buildConnectorAuthorizeHref({
    slug: connector.provider,
    teamspaceId,
    accountId,
    returnTo,
    scope,
  });

  function disconnect(connectionId: string) {
    startTransition(async () => {
      await disconnectConnectionAction({
        teamspaceId,
        connectionId,
        revalidate: returnTo,
      });
    });
  }

  return (
    <div className="space-y-4">
      <AgentSettingCard.Root testId={`connection-scope-${scope}`}>
        <AgentSettingCard.Header
          title={meta.title}
          description={meta.subtitle}
        />
        <AgentSettingCard.Body>
          <AgentSettingCard.Items divided>
            {connections.length === 0 ? (
              <AgentSettingCard.Empty>
                No accounts connected yet.
              </AgentSettingCard.Empty>
            ) : (
              connections.map((conn) => {
                const label = conn.name ?? connector.label;
                return (
                  <AgentSettingCard.Item
                    key={conn.id}
                    testId="connection-row"
                    icon={
                      <ConnectorBrandIcon
                        provider={connector.provider}
                        className="size-3.5"
                      />
                    }
                    title={label}
                    trailing={
                      <div className="flex items-center gap-1">
                        <a
                          href={href}
                          className={buttonVariants({
                            variant: "ghost",
                            size: "icon-sm",
                            className: "text-muted-foreground",
                          })}
                          data-testid={`reconnect-${connector.provider}`}
                          aria-label={`Reconnect ${label}`}
                        >
                          <ArrowClockwiseIcon className="size-4" />
                        </a>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={isPending}
                          className="text-muted-foreground hover:bg-destructive/10! hover:text-destructive! [&_svg]:text-current"
                          onClick={() => disconnect(conn.id)}
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
            href={href}
            data-testid={`connect-${scope}-${connector.provider}`}
          >
            <PlusIcon className="size-4" />
            {connected ? "Add connection" : "Connect"}
          </a>
        </AgentSettingCard.Footer>
      </AgentSettingCard.Root>

      {scope === "user" && connected ? (
        <ToolAccessSection
          toolkit={connector.provider}
          teamspaceId={teamspaceId}
          returnTo={returnTo}
        />
      ) : null}
    </div>
  );
}

interface ToolRow {
  slug: string;
  name: string;
}

/**
 * Per-toolkit tool restrictions. Lazily loads the toolkit's available tools and
 * the entity's disabled set; toggling a tool off persists it
 * (connector_tool_settings) and excludes it from the agent's next session.
 */
function ToolAccessSection({
  toolkit,
  teamspaceId,
  returnTo,
}: {
  toolkit: string;
  teamspaceId: string;
  returnTo: string;
}) {
  const [tools, setTools] = useState<ToolRow[] | null>(null);
  const [disabled, setDisabled] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadToolkitToolSettingsAction({ teamspaceId, toolkit })
      .then((res) => {
        if (!active) return;
        setTools(res.tools.map((t) => ({ slug: t.slug, name: t.name })));
        setDisabled(new Set(res.disabled));
      })
      .catch(() => {
        if (active) setTools([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [teamspaceId, toolkit]);

  function toggle(slug: string, enabled: boolean) {
    const next = new Set(disabled);
    if (enabled) next.delete(slug);
    else next.add(slug);
    setDisabled(next);
    startTransition(async () => {
      await setToolkitDisabledAction({
        teamspaceId,
        toolkit,
        disabled: [...next],
        revalidate: returnTo,
      });
    });
  }

  return (
    <AgentSettingCard.Root testId={`connection-tool-access-${toolkit}`}>
      <AgentSettingCard.Header
        title="Tool access"
        description="Turn off tools the agent should not use for this connector."
      />
      <AgentSettingCard.Body>
        {loading ? (
          <p className="text-muted-foreground px-1 py-2 text-xs">Loading tools…</p>
        ) : !tools || tools.length === 0 ? (
          <AgentSettingCard.Empty>No tools available.</AgentSettingCard.Empty>
        ) : (
          <AgentSettingCard.Items>
            {tools.map((tool) => {
              const enabled = !disabled.has(tool.slug);
              return (
                <AgentSettingCard.Item
                  key={tool.slug}
                  title={tool.name}
                  trailing={
                    <Switch
                      checked={enabled}
                      onCheckedChange={(checked) => toggle(tool.slug, checked)}
                      aria-label={`Enable ${tool.name}`}
                    />
                  }
                />
              );
            })}
          </AgentSettingCard.Items>
        )}
      </AgentSettingCard.Body>
    </AgentSettingCard.Root>
  );
}
