"use client";

import { useTransition } from "react";
import {
  LinkSimpleIcon,
  PlugIcon,
  PlusIcon,
  XIcon,
} from "@phosphor-icons/react";
import { Button, buttonVariants } from "@ssota/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ssota/ui/components/ui/card";
import type { ConnectorDef } from "@/lib/connect/connectors";
import { providerOf } from "@/lib/connect/connectors";
import { disconnectConnectionAction } from "@/app/[orgSlug]/[projectSlug]/connections/actions";

export interface ConnectionRow {
  id: string;
  connector: string;
  installationId: string;
  tenantId: string | null;
  name: string | null;
}

interface ConnectionsListProps {
  connectors: ConnectorDef[];
  connections: ConnectionRow[];
  projectId: string;
  accountId: string;
  returnTo: string;
}

function authorizeHref(params: {
  connectorUid: string;
  accountId: string;
  projectId: string;
  returnTo: string;
}): string {
  const search = new URLSearchParams({
    connector: params.connectorUid,
    accountId: params.accountId,
    projectId: params.projectId,
    returnTo: params.returnTo,
  });
  return `/api/connect/authorize?${search.toString()}`;
}

function connectionLabel(row: ConnectionRow): string {
  return row.name || row.tenantId || row.installationId || "Connected";
}

export function ConnectionsList({
  connectors,
  connections,
  projectId,
  accountId,
  returnTo,
}: ConnectionsListProps) {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Connections</h1>
        <p className="text-sm text-muted-foreground">
          Connect third-party services so the agent can act on your behalf.
        </p>
      </header>

      {connectors.map((connector) => {
        const rows = connections.filter(
          (c) => providerOf(c.connector) === connector.provider,
        );
        return (
          <ConnectorCard
            key={connector.provider}
            connector={connector}
            rows={rows}
            projectId={projectId}
            accountId={accountId}
            returnTo={returnTo}
          />
        );
      })}
    </div>
  );
}

function ConnectorCard({
  connector,
  rows,
  projectId,
  accountId,
  returnTo,
}: {
  connector: ConnectorDef;
  rows: ConnectionRow[];
  projectId: string;
  accountId: string;
  returnTo: string;
}) {
  const [isPending, startTransition] = useTransition();
  const configured = Boolean(connector.connectorUid);
  const href = configured
    ? authorizeHref({
        connectorUid: connector.connectorUid as string,
        accountId,
        projectId,
        returnTo,
      })
    : "#";

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
    <Card data-testid={`connector-${connector.provider}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PlugIcon className="size-4 text-muted-foreground" />
          {connector.label}
          {connector.multiWorkspace ? (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-normal text-muted-foreground">
              multiple workspaces
            </span>
          ) : null}
        </CardTitle>
        <CardDescription>{connector.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!configured ? (
          <p className="text-sm text-muted-foreground">
            Not configured for this deployment.
          </p>
        ) : connector.multiWorkspace ? (
          <MultiWorkspaceBody
            provider={connector.provider}
            rows={rows}
            href={href}
            isPending={isPending}
            onDisconnect={disconnect}
          />
        ) : (
          <SingleWorkspaceBody
            provider={connector.provider}
            row={rows[0]}
            href={href}
            isPending={isPending}
            onDisconnect={disconnect}
          />
        )}
      </CardContent>
    </Card>
  );
}

function ConnectionItem({
  row,
  isPending,
  onDisconnect,
}: {
  row: ConnectionRow;
  isPending: boolean;
  onDisconnect: (id: string) => void;
}) {
  return (
    <div
      className="flex items-center justify-between rounded-md border px-3 py-2"
      data-testid="connection-row"
    >
      <span className="flex items-center gap-2 text-sm">
        <LinkSimpleIcon className="size-4 text-muted-foreground" />
        {connectionLabel(row)}
      </span>
      <Button
        variant="ghost"
        size="sm"
        disabled={isPending}
        onClick={() => onDisconnect(row.id)}
      >
        <XIcon className="size-4" />
        Disconnect
      </Button>
    </div>
  );
}

function MultiWorkspaceBody({
  provider,
  rows,
  href,
  isPending,
  onDisconnect,
}: {
  provider: string;
  rows: ConnectionRow[];
  href: string;
  isPending: boolean;
  onDisconnect: (id: string) => void;
}) {
  return (
    <>
      {rows.length > 0 ? (
        <div className="space-y-2">
          {rows.map((row) => (
            <ConnectionItem
              key={row.id}
              row={row}
              isPending={isPending}
              onDisconnect={onDisconnect}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No workspaces connected.</p>
      )}
      <a
        className={buttonVariants({ variant: "outline", size: "sm" })}
        href={href}
        data-testid={`connect-${provider}`}
      >
        <PlusIcon className="size-4" />
        {rows.length > 0 ? "Add workspace" : "Connect"}
      </a>
    </>
  );
}

function SingleWorkspaceBody({
  provider,
  row,
  href,
  isPending,
  onDisconnect,
}: {
  provider: string;
  row: ConnectionRow | undefined;
  href: string;
  isPending: boolean;
  onDisconnect: (id: string) => void;
}) {
  if (!row) {
    return (
      <a
        className={buttonVariants({ variant: "outline", size: "sm" })}
        href={href}
        data-testid={`connect-${provider}`}
      >
        <PlugIcon className="size-4" />
        Connect
      </a>
    );
  }
  return (
    <div className="space-y-2">
      <ConnectionItem row={row} isPending={isPending} onDisconnect={onDisconnect} />
      <a
        className={buttonVariants({ variant: "ghost", size: "sm" })}
        href={href}
        data-testid={`reconnect-${provider}`}
      >
        Reconnect
      </a>
    </div>
  );
}
