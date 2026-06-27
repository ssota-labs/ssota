"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  ArrowLeftIcon,
  BuildingsIcon,
  CaretRightIcon,
  CheckCircleIcon,
  LinkBreakIcon,
  PlusIcon,
  UserIcon,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { Badge } from "@ssota/ui/components/ui/badge";
import { Button, buttonVariants } from "@ssota/ui/components/ui/button";
import { Switch } from "@ssota/ui/components/ui/switch";
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
  disconnectConnectionAction,
  loadToolkitToolSettingsAction,
  setToolkitDisabledAction,
} from "@/app/[orgSlug]/[projectSlug]/connectors/actions";
import {
  CONNECTOR_THEMES,
  type ConnectorDef,
  type ConnectorProvider,
} from "@/lib/connect/connectors";

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

type Scope = "user" | "org";

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
  projectId: string;
  accountId: string;
  returnTo: string;
  /** Show the org-shared scope (builder console). End-user app shows personal only. */
  allowOrgScope: boolean;
}

function authorizeHref(params: {
  slug: string;
  projectId: string;
  accountId: string;
  returnTo: string;
  scope: Scope;
}): string {
  const search = new URLSearchParams({
    connector: params.slug,
    accountId: params.accountId,
    projectId: params.projectId,
    returnTo: params.returnTo,
  });
  if (params.scope === "org") search.set("scope", "org");
  return `/api/connect/authorize?${search.toString()}`;
}

export function ConnectorsView({
  connectors,
  connections,
  projectId,
  accountId,
  returnTo,
  allowOrgScope,
}: ConnectorsViewProps) {
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

  const connectedCount = byProvider.size;

  return (
    <>
      <BrowseWorkspace.Frame>
        <BrowseWorkspace.Header
          title="Connectors"
          description={`Browse and manage the apps your agent can use. ${connectedCount} connected.`}
        />

        {groups.map((group) => (
          <BrowseWorkspace.Section key={group.theme} label={group.theme}>
            <BrowseWorkspace.Grid>
              {group.items.map((connector) => {
                const entry = byProvider.get(connector.provider);
                const connected =
                  (entry?.user.length ?? 0) + (entry?.org.length ?? 0) > 0;
                return (
                  <ConnectorCard
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

      <Sheet
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <SheetContent side="right" className="flex flex-col gap-0 p-0">
          {selectedConnector ? (
            <ConnectorSettings
              connector={selectedConnector}
              userConnections={selectedScoped.user}
              orgConnections={selectedScoped.org}
              allowOrgScope={allowOrgScope}
              projectId={projectId}
              accountId={accountId}
              returnTo={returnTo}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}

function ConnectorCard({
  connector,
  connected,
  onSelect,
}: {
  connector: ConnectorDef;
  connected: boolean;
  onSelect: () => void;
}) {
  const configured = Boolean(connector.connectorUid);
  return (
    <BrowseWorkspace.Card
      title={connector.label}
      subtitle={connector.description}
      highlighted={connected}
      onSelect={onSelect}
      testId={`connector-${connector.provider}`}
      icon={
        <ConnectorBrandIcon provider={connector.provider} className="size-5" />
      }
      badge={
        connected ? (
          <Badge variant="secondary" className="shrink-0 gap-1 font-normal">
            <CheckCircleIcon weight="fill" className="size-3 text-primary" />
            Connected
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

function ConnectorSettings({
  connector,
  userConnections,
  orgConnections,
  allowOrgScope,
  projectId,
  accountId,
  returnTo,
}: {
  connector: ConnectorDef;
  userConnections: ConnectorConnection[];
  orgConnections: ConnectorConnection[];
  allowOrgScope: boolean;
  projectId: string;
  accountId: string;
  returnTo: string;
}) {
  const configured = Boolean(connector.connectorUid);
  const scopes: Scope[] = allowOrgScope ? ["user", "org"] : ["user"];
  // Single scope → open it directly; multiple → show the scope list first.
  const [scope, setScope] = useState<Scope | null>(
    scopes.length === 1 ? "user" : null,
  );
  const connectionsFor = (s: Scope) =>
    s === "user" ? userConnections : orgConnections;

  return (
    <>
      <SheetHeader className="gap-3 border-b px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
            <ConnectorBrandIcon provider={connector.provider} className="size-5" />
          </span>
          <div className="min-w-0">
            <SheetTitle className="text-base">{connector.label}</SheetTitle>
            <SheetDescription className="text-xs">
              {connector.description}
            </SheetDescription>
          </div>
        </div>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {!configured ? (
          <p className="rounded-md border border-dashed bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground">
            This connector is not configured for this deployment.
          </p>
        ) : scope === null ? (
          <ScopeList scopes={scopes} connectionsFor={connectionsFor} onSelect={setScope} />
        ) : (
          <ScopeDetail
            connector={connector}
            scope={scope}
            connections={connectionsFor(scope)}
            onBack={scopes.length > 1 ? () => setScope(null) : undefined}
            projectId={projectId}
            accountId={accountId}
            returnTo={returnTo}
          />
        )}
      </div>
    </>
  );
}

/** Card-list of access scopes (document-list-sheet style: divided rows → detail). */
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
    <div className="space-y-3">
      <div className="space-y-1">
        <h3 className="text-sm font-medium">Access scope</h3>
        <p className="text-xs text-muted-foreground">
          Who this connection applies to and which tools the agent may use.
        </p>
      </div>

      <div className="divide-y divide-border overflow-hidden rounded-lg border">
        {scopes.map((s) => {
          const meta = SCOPE_META[s];
          const ScopeIcon = meta.icon;
          const count = connectionsFor(s).length;
          return (
            <button
              key={s}
              type="button"
              data-testid={`scope-${s}`}
              onClick={() => onSelect(s)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
                <ScopeIcon className="size-4 text-muted-foreground" />
              </span>
              <div className="min-w-0 flex-1 space-y-0.5">
                <span className="block text-sm font-medium">{meta.title}</span>
                <p className="line-clamp-1 text-xs text-muted-foreground">
                  {meta.subtitle}
                </p>
              </div>
              {count > 0 ? (
                <Badge variant="secondary" className="shrink-0 gap-1 font-normal">
                  <CheckCircleIcon weight="fill" className="size-3 text-primary" />
                  {count}
                </Badge>
              ) : null}
              <CaretRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Detail for one scope: connected accounts + connect + tool access. */
function ScopeDetail({
  connector,
  scope,
  connections,
  onBack,
  projectId,
  accountId,
  returnTo,
}: {
  connector: ConnectorDef;
  scope: Scope;
  connections: ConnectorConnection[];
  onBack?: () => void;
  projectId: string;
  accountId: string;
  returnTo: string;
}) {
  const [isPending, startTransition] = useTransition();
  const meta = SCOPE_META[scope];
  const ScopeIcon = meta.icon;
  const connected = connections.length > 0;
  const href = authorizeHref({
    slug: connector.provider,
    projectId,
    accountId,
    returnTo,
    scope,
  });

  function disconnect(connectionId: string) {
    startTransition(async () => {
      await disconnectConnectionAction({ projectId, connectionId, revalidate: returnTo });
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {onBack ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Back"
            onClick={onBack}
            className="shrink-0"
          >
            <ArrowLeftIcon className="size-4" />
          </Button>
        ) : null}
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
          <ScopeIcon className="size-4 text-muted-foreground" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium">{meta.title}</p>
          <p className="text-xs text-muted-foreground">{meta.subtitle}</p>
        </div>
      </div>

      <div className="space-y-2">
        {connections.map((conn) => (
          <div
            key={conn.id}
            className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2"
            data-testid="connection-row"
          >
            <span className="truncate text-sm">{conn.name ?? connector.label}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isPending}
              className="shrink-0 text-muted-foreground hover:bg-destructive/10! hover:text-destructive! [&_svg]:text-current"
              onClick={() => disconnect(conn.id)}
            >
              <LinkBreakIcon className="size-4" />
              Disconnect
            </Button>
          </div>
        ))}

        <a
          className={buttonVariants({ variant: "outline", size: "sm" })}
          href={href}
          data-testid={`connect-${scope}-${connector.provider}`}
        >
          <PlusIcon className="size-4" />
          {connected ? "Add account" : "Connect"}
        </a>
      </div>

      {/* Per-tool restrictions apply to the personal (user) scope. */}
      {scope === "user" && connected ? (
        <ToolAccessSection
          toolkit={connector.provider}
          projectId={projectId}
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
  projectId,
  returnTo,
}: {
  toolkit: string;
  projectId: string;
  returnTo: string;
}) {
  const [tools, setTools] = useState<ToolRow[] | null>(null);
  const [disabled, setDisabled] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadToolkitToolSettingsAction({ projectId, toolkit })
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
  }, [projectId, toolkit]);

  function toggle(slug: string, enabled: boolean) {
    const next = new Set(disabled);
    if (enabled) next.delete(slug);
    else next.add(slug);
    setDisabled(next);
    startTransition(async () => {
      await setToolkitDisabledAction({
        projectId,
        toolkit,
        disabled: [...next],
        revalidate: returnTo,
      });
    });
  }

  return (
    <div className="space-y-2 border-t pt-3">
      <div className="space-y-0.5">
        <p className="text-xs font-medium">Tool access</p>
        <p className="text-[11px] text-muted-foreground">
          Turn off tools the agent should not use for this connector.
        </p>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading tools…</p>
      ) : !tools || tools.length === 0 ? (
        <p className="text-xs text-muted-foreground">No tools available.</p>
      ) : (
        <ul className="max-h-64 space-y-0.5 overflow-y-auto">
          {tools.map((tool) => {
            const enabled = !disabled.has(tool.slug);
            return (
              <li
                key={tool.slug}
                className="flex items-center justify-between gap-3 rounded-md px-1.5 py-1.5 hover:bg-accent/40"
              >
                <span className="min-w-0 truncate text-xs" title={tool.slug}>
                  {tool.name}
                </span>
                <Switch
                  checked={enabled}
                  onCheckedChange={(checked) => toggle(tool.slug, checked)}
                  aria-label={`Enable ${tool.name}`}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
