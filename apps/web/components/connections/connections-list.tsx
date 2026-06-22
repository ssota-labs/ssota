"use client";

import { useMemo, useTransition } from "react";
import { ArrowClockwiseIcon, LinkBreakIcon, PlusIcon } from "@phosphor-icons/react";
import { Badge } from "@ssota/ui/components/ui/badge";
import { Button, buttonVariants } from "@ssota/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ssota/ui/components/ui/card";
import { cn } from "@ssota/ui/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ssota/ui/components/ui/tooltip";
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
  installationId?: string;
}): string {
  const search = new URLSearchParams({
    connector: params.connectorUid,
    accountId: params.accountId,
    projectId: params.projectId,
    returnTo: params.returnTo,
  });
  if (params.installationId) {
    search.set("installationId", params.installationId);
  }
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
        </div>
      </header>

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
        "flex h-full flex-col transition-colors",
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
          {t(`connections.providers.${connector.provider}.description`)}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col pt-0">
        {!configured ? (
          <p className="rounded-md border border-dashed bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground">
            {t("connections.notConfiguredHint")}
          </p>
        ) : connector.multiWorkspace ? (
          <MultiWorkspaceBody
            provider={connector.provider}
            connectorUid={connector.connectorUid as string}
            rows={rows}
            href={href}
            accountId={accountId}
            projectId={projectId}
            returnTo={returnTo}
            isPending={isPending}
            onDisconnect={disconnect}
          />
        ) : (
          <SingleWorkspaceBody
            provider={connector.provider}
            connectorUid={connector.connectorUid as string}
            row={rows[0]}
            href={href}
            accountId={accountId}
            projectId={projectId}
            returnTo={returnTo}
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
  reconnectHref,
  isPending,
  onDisconnect,
}: {
  row: ConnectionRow;
  provider: ConnectorProvider;
  reconnectHref: string;
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
      <div className="flex shrink-0 items-center gap-1">
        <Tooltip>
          <TooltipTrigger
            render={
              <a
                className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                href={reconnectHref}
                data-testid={`reconnect-${provider}`}
                aria-label={t("connections.reconnect")}
              />
            }
          >
            <ArrowClockwiseIcon className="size-4" />
          </TooltipTrigger>
          <TooltipContent>{t("connections.reconnect")}</TooltipContent>
        </Tooltip>
        <Button
          variant="ghost"
          size="sm"
          disabled={isPending}
          onClick={() => onDisconnect(row.id)}
          className="text-muted-foreground hover:bg-destructive/10! hover:text-destructive! [&_svg]:text-current"
        >
          <LinkBreakIcon className="size-4" />
          {t("connections.disconnect")}
        </Button>
      </div>
    </div>
  );
}

function reconnectHrefForRow(
  params: {
    connectorUid: string;
    accountId: string;
    projectId: string;
    returnTo: string;
  },
  row: ConnectionRow,
): string {
  return authorizeHref({
    ...params,
    ...(row.installationId ? { installationId: row.installationId } : {}),
  });
}

function MultiWorkspaceBody({
  provider,
  connectorUid,
  rows,
  href,
  accountId,
  projectId,
  returnTo,
  isPending,
  onDisconnect,
}: {
  provider: string;
  connectorUid: string;
  rows: ConnectionRow[];
  href: string;
  accountId: string;
  projectId: string;
  returnTo: string;
  isPending: boolean;
  onDisconnect: (id: string) => void;
}) {
  const { t } = useLocale();
  const authorizeParams = { connectorUid, accountId, projectId, returnTo };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="min-h-0 flex-1 space-y-2">
        {rows.length > 0 ? (
          rows.map((row) => (
            <ConnectionItem
              key={row.id}
              row={row}
              provider={provider as ConnectorProvider}
              reconnectHref={reconnectHrefForRow(authorizeParams, row)}
              isPending={isPending}
              onDisconnect={onDisconnect}
            />
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("connections.noWorkspaces")}
          </p>
        )}
      </div>
      <a
        className={buttonVariants({
          variant: rows.length > 0 ? "outline" : "default",
          size: "sm",
        })}
        href={href}
        data-testid={`connect-${provider}`}
      >
        <PlusIcon className="size-4" />
        {rows.length > 0
          ? t("connections.addWorkspace")
          : t("connections.connect")}
      </a>
    </div>
  );
}

function SingleWorkspaceBody({
  provider,
  connectorUid,
  row,
  href,
  accountId,
  projectId,
  returnTo,
  isPending,
  onDisconnect,
}: {
  provider: string;
  connectorUid: string;
  row: ConnectionRow | undefined;
  href: string;
  accountId: string;
  projectId: string;
  returnTo: string;
  isPending: boolean;
  onDisconnect: (id: string) => void;
}) {
  const { t } = useLocale();

  if (!row) {
    return (
      <div className="flex min-h-0 flex-1 flex-col justify-end">
        <a
          className={buttonVariants({ size: "sm" })}
          href={href}
          data-testid={`connect-${provider}`}
        >
          <PlusIcon className="size-4" />
          {t("connections.connect")}
        </a>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ConnectionItem
        row={row}
        provider={provider as ConnectorProvider}
        reconnectHref={reconnectHrefForRow(
          { connectorUid, accountId, projectId, returnTo },
          row,
        )}
        isPending={isPending}
        onDisconnect={onDisconnect}
      />
    </div>
  );
}
