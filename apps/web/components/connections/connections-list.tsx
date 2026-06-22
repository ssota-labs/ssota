"use client";

import { useMemo, useTransition } from "react";
import { PlusIcon, XIcon } from "@phosphor-icons/react";
import { Badge } from "@ssota/ui/components/ui/badge";
import { Button, buttonVariants } from "@ssota/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ssota/ui/components/ui/card";
import { Separator } from "@ssota/ui/components/ui/separator";
import { cn } from "@ssota/ui/lib/utils";
import { useLocale } from "@/components/i18n/locale-provider";
import { ConnectorBrandIcon } from "@/components/connections/connector-brand-icon";
import { disconnectConnectionAction } from "@/app/[orgSlug]/[projectSlug]/connections/actions";
import type { ConnectorDef, ConnectorProvider } from "@/lib/connect/connectors";
import { providerOf } from "@/lib/connect/connectors";

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
  const { t } = useLocale();

  const connectedCount = connections.length;
  const availableCount = connectors.filter((c) => c.connectorUid).length;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="space-y-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("connections.title")}
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {t("connections.description")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            {t("connections.summaryConnected", { count: connectedCount })}
          </Badge>
          <Badge variant="outline">
            {t("connections.summaryAvailable", { count: availableCount })}
          </Badge>
        </div>
      </header>

      <Separator />

      <div className="grid gap-4 sm:grid-cols-2">
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
  const { t } = useLocale();
  const [isPending, startTransition] = useTransition();
  const configured = Boolean(connector.connectorUid);
  const connected = rows.length > 0;
  const href = configured
    ? authorizeHref({
        connectorUid: connector.connectorUid as string,
        accountId,
        projectId,
        returnTo,
      })
    : "#";

  const status = useMemo(() => {
    if (!configured) {
      return {
        label: t("connections.statusNotConfigured"),
        variant: "secondary" as const,
      };
    }
    if (connected) {
      return {
        label: t("connections.statusConnected"),
        variant: "default" as const,
      };
    }
    return {
      label: t("connections.statusNotConnected"),
      variant: "outline" as const,
    };
  }, [configured, connected, t]);

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
    <Card
      data-testid={`connector-${connector.provider}`}
      className={cn(
        "flex flex-col transition-colors",
        connected && "border-primary/20 bg-primary/2",
      )}
    >
      <CardHeader className="gap-3 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted/50",
                connected && "border-primary/20 bg-primary/5",
              )}
            >
              <ConnectorBrandIcon
                provider={connector.provider}
                className="size-5"
              />
            </div>
            <div className="min-w-0 space-y-1">
              <CardTitle className="text-base">{connector.label}</CardTitle>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant={status.variant}>{status.label}</Badge>
                {connector.multiWorkspace ? (
                  <Badge variant="outline" className="font-normal">
                    {t("connections.multiWorkspace")}
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>
        </div>
        <CardDescription className="text-sm leading-relaxed">
          {connector.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="mt-auto space-y-3 pt-0">
        {!configured ? (
          <p className="rounded-md border border-dashed bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground">
            {t("connections.notConfiguredHint")}
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
  provider,
  isPending,
  onDisconnect,
}: {
  row: ConnectionRow;
  provider: ConnectorProvider;
  isPending: boolean;
  onDisconnect: (id: string) => void;
}) {
  const { t } = useLocale();
  const label = connectionLabel(row);

  return (
    <div
      className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2.5"
      data-testid="connection-row"
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md border bg-background p-1">
          <ConnectorBrandIcon provider={provider} className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{label}</p>
          {row.tenantId && row.name ? (
            <p className="truncate text-xs text-muted-foreground">
              {row.tenantId}
            </p>
          ) : null}
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        disabled={isPending}
        onClick={() => onDisconnect(row.id)}
        className="shrink-0 text-muted-foreground hover:text-destructive"
      >
        <XIcon className="size-4" />
        {t("connections.disconnect")}
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
  const { t } = useLocale();

  return (
    <>
      {rows.length > 0 ? (
        <div className="space-y-2">
          {rows.map((row) => (
            <ConnectionItem
              key={row.id}
              row={row}
              provider={provider as ConnectorProvider}
              isPending={isPending}
              onDisconnect={onDisconnect}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {t("connections.noWorkspaces")}
        </p>
      )}
      <a
        className={buttonVariants({ variant: rows.length > 0 ? "outline" : "default", size: "sm" })}
        href={href}
        data-testid={`connect-${provider}`}
      >
        <PlusIcon className="size-4" />
        {rows.length > 0
          ? t("connections.addWorkspace")
          : t("connections.connect")}
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
  const { t } = useLocale();

  if (!row) {
    return (
      <a
        className={buttonVariants({ size: "sm" })}
        href={href}
        data-testid={`connect-${provider}`}
      >
        <PlusIcon className="size-4" />
        {t("connections.connect")}
      </a>
    );
  }

  return (
    <div className="space-y-2">
      <ConnectionItem
        row={row}
        provider={provider as ConnectorProvider}
        isPending={isPending}
        onDisconnect={onDisconnect}
      />
      <a
        className={buttonVariants({ variant: "ghost", size: "sm" })}
        href={href}
        data-testid={`reconnect-${provider}`}
      >
        {t("connections.reconnect")}
      </a>
    </div>
  );
}
