"use client";

import { useMemo, useState, useTransition } from "react";
import {
  BuildingsIcon,
  CheckCircleIcon,
  LinkBreakIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import { Badge } from "@ssota/ui/components/ui/badge";
import { Button, buttonVariants } from "@ssota/ui/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@ssota/ui/components/ui/sheet";
import {
  ExpandableListSection,
  ExpandableListItem,
} from "@ssota/ui/components/ui/expandable-list-section";
import { cn } from "@ssota/ui/lib/utils";
import { ConnectorBrandIcon } from "@/components/connections/connector-brand-icon";
import { disconnectConnectionAction } from "@/app/[orgSlug]/[projectSlug]/connectors/actions";
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

interface ConnectorsViewProps {
  connectors: ConnectorDef[];
  connections: ConnectorConnection[];
  projectId: string;
  accountId: string;
  returnTo: string;
}

function authorizeHref(params: {
  slug: string;
  projectId: string;
  accountId: string;
  returnTo: string;
}): string {
  const search = new URLSearchParams({
    connector: params.slug,
    accountId: params.accountId,
    projectId: params.projectId,
    returnTo: params.returnTo,
  });
  return `/api/connect/authorize?${search.toString()}`;
}

export function ConnectorsView({
  connectors,
  connections,
  projectId,
  accountId,
  returnTo,
}: ConnectorsViewProps) {
  const [selected, setSelected] = useState<ConnectorProvider | null>(null);

  const connectedByProvider = useMemo(() => {
    const map = new Map<string, ConnectorConnection[]>();
    for (const c of connections) {
      const list = map.get(c.connector) ?? [];
      list.push(c);
      map.set(c.connector, list);
    }
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
  const selectedConnections = selected
    ? (connectedByProvider.get(selected) ?? [])
    : [];

  const connectedCount = connectedByProvider.size;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Connectors</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Browse and manage the apps your agent can use. {connectedCount} connected.
        </p>
      </header>

      {groups.map((group) => (
        <section key={group.theme} className="space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {group.theme}
          </h2>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map((connector) => {
              const connected =
                (connectedByProvider.get(connector.provider)?.length ?? 0) > 0;
              return (
                <ConnectorCard
                  key={connector.provider}
                  connector={connector}
                  connected={connected}
                  onSelect={() => setSelected(connector.provider)}
                />
              );
            })}
          </div>
        </section>
      ))}

      <Sheet
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <SheetContent side="right" className="flex flex-col gap-0 p-0">
          {selectedConnector ? (
            <ConnectorSettings
              connector={selectedConnector}
              connections={selectedConnections}
              projectId={projectId}
              accountId={accountId}
              returnTo={returnTo}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
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
    <button
      type="button"
      onClick={onSelect}
      data-testid={`connector-${connector.provider}`}
      className={cn(
        "group flex items-center gap-3 rounded-xl border bg-card px-3.5 py-3 text-left transition-colors",
        "hover:border-primary/30 hover:bg-accent/40",
        connected && "border-primary/20",
      )}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
        <ConnectorBrandIcon provider={connector.provider} className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">
          {connector.label}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {connector.description}
        </span>
      </span>
      {connected ? (
        <Badge variant="secondary" className="shrink-0 gap-1 font-normal">
          <CheckCircleIcon weight="fill" className="size-3 text-primary" />
          Connected
        </Badge>
      ) : !configured ? (
        <Badge variant="outline" className="shrink-0 font-normal text-muted-foreground">
          Off
        </Badge>
      ) : null}
    </button>
  );
}

function ConnectorSettings({
  connector,
  connections,
  projectId,
  accountId,
  returnTo,
}: {
  connector: ConnectorDef;
  connections: ConnectorConnection[];
  projectId: string;
  accountId: string;
  returnTo: string;
}) {
  const [expanded, setExpanded] = useState(true);
  const [isPending, startTransition] = useTransition();
  const configured = Boolean(connector.connectorUid);
  const connected = connections.length > 0;
  const href = authorizeHref({
    slug: connector.provider,
    projectId,
    accountId,
    returnTo,
  });

  function disconnect(connectionId: string) {
    startTransition(async () => {
      await disconnectConnectionAction({
        projectId,
        connectionId,
        revalidate: returnTo,
      });
    });
  }

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
        ) : (
          <ExpandableListSection
            title="Access scope"
            description="Who this connection applies to and which tools the agent may use."
            addLabel=""
            hasItems
          >
            <ExpandableListItem
              icon={BuildingsIcon}
              title="Organization workspace"
              description={
                connected ? `${connections.length} connected` : "Not connected"
              }
              expanded={expanded}
              onExpandedChange={setExpanded}
              removeLabel="Disconnect"
            >
              <div className="space-y-3">
                {connections.map((conn) => (
                  <div
                    key={conn.id}
                    className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2"
                    data-testid="connection-row"
                  >
                    <span className="truncate text-sm">
                      {conn.name ?? connector.label}
                    </span>
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
                  data-testid={`connect-${connector.provider}`}
                >
                  <PlusIcon className="size-4" />
                  {connected ? "Add account" : "Connect"}
                </a>
              </div>
            </ExpandableListItem>
          </ExpandableListSection>
        )}
      </div>
    </>
  );
}
