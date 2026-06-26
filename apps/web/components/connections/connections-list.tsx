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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@ssota/ui/components/ui/alert-dialog";
import { useLocale } from "@/components/i18n/locale-provider";
import { ConnectorBrandIcon } from "@/components/connections/connector-brand-icon";
import { useConnectionDisplayEnrichment } from "@/components/connections/use-connection-display-enrichment";
import { disconnectConnectionAction } from "@/app/[orgSlug]/[projectSlug]/connections/actions";
import type { ConnectorDef, ConnectorProvider } from "@/lib/connect/connectors";
import { providerOf } from "@/lib/connect/connectors";
import { connectionDisplaySubtitle } from "@/lib/connections/display";

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
          // Match by the exact configured connector uid. This is required for
          // MCP connectors whose uid host (`mcp.notion.com/...`) does not equal
          // the provider segment, so a `providerOf` comparison would never match
          // them. Falls back to provider matching only when unconfigured.
          const rows = connections.filter((c) =>
            connector.connectorUid
              ? c.connector === connector.connectorUid
              : providerOf(c.connector) === connector.provider,
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
        label: t(
          connector.isMcp
            ? "connections.statusMcpConnected"
            : "connections.statusConnected",
        ),
        variant: "default" as const,
      };
    }
    return {
      label: t("connections.statusNotConnected"),
      variant: "outline" as const,
    };
  }, [configured, connected, connector.isMcp, t]);

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
                {connector.isMcp ? (
                  <Badge variant="outline" className="font-normal">
                    {t("connections.mcpBadge")}
                  </Badge>
                ) : connector.multiWorkspace ? (
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
        ) : connector.isMcp ? (
          <McpBody
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
  projectId,
  accountId,
  onDisconnect,
}: {
  row: ConnectionRow;
  provider: ConnectorProvider;
  reconnectHref: string;
  isPending: boolean;
  projectId: string;
  accountId: string;
  onDisconnect: (id: string) => void;
}) {
  const { t } = useLocale();
  const { label, isEnriching, displayRow } = useConnectionDisplayEnrichment(
    row,
    projectId,
    accountId,
    provider,
  );
  const subtitle = connectionDisplaySubtitle(displayRow, provider);

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
          <p
            className={cn(
              "truncate text-sm font-medium",
              isEnriching && "text-muted-foreground",
            )}
          >
            {label}
          </p>
          {subtitle ? (
            <p className="truncate text-xs text-muted-foreground">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
      <ConnectionActions
        provider={provider}
        reconnectHref={reconnectHref}
        label={label}
        rowId={row.id}
        isPending={isPending}
        onDisconnect={onDisconnect}
      />
    </div>
  );
}

/**
 * Reconnect + disconnect controls shared by the per-workspace install row
 * (`ConnectionItem`) and the single-grant MCP row (`McpBody`).
 */
function ConnectionActions({
  provider,
  reconnectHref,
  label,
  rowId,
  isPending,
  onDisconnect,
}: {
  provider: ConnectorProvider;
  reconnectHref: string;
  label: string;
  rowId: string;
  isPending: boolean;
  onDisconnect: (id: string) => void;
}) {
  const { t } = useLocale();
  return (
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
      <AlertDialog>
        <AlertDialogTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              disabled={isPending}
              className="text-muted-foreground hover:bg-destructive/10! hover:text-destructive! [&_svg]:text-current"
            />
          }
        >
          <LinkBreakIcon className="size-4" />
          {t("connections.disconnect")}
        </AlertDialogTrigger>
        <AlertDialogContent data-testid="disconnect-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("connections.disconnectTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("connections.disconnectDescription", { name: label })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isPending}
              data-testid="disconnect-dialog-confirm"
              onClick={() => onDisconnect(rowId)}
            >
              {t("connections.disconnectConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
              projectId={projectId}
              accountId={accountId}
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
          variant: "outline",
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
          className={buttonVariants({ variant: "outline", size: "sm" })}
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
        projectId={projectId}
        accountId={accountId}
        onDisconnect={onDisconnect}
      />
    </div>
  );
}

/**
 * Body for an MCP-type connector (e.g. Notion via mcp.notion.com). Unlike the
 * provider-API connectors, an MCP connector is a single user-subject grant with
 * no per-workspace installation id — so there is no workspace list and no "Add
 * workspace": just a single "MCP Connected" state with reconnect/disconnect.
 *
 * Deliberately skips `useConnectionDisplayEnrichment`: that hook calls the
 * provider's REST API (e.g. api.notion.com) to resolve a workspace name, but an
 * MCP grant's token is scoped to the MCP server and is not a valid provider-API
 * token, so the lookup would always fail. There is no workspace name to show.
 */
function McpBody({
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
          className={buttonVariants({ variant: "outline", size: "sm" })}
          href={href}
          data-testid={`connect-${provider}`}
        >
          <PlusIcon className="size-4" />
          {t("connections.connect")}
        </a>
      </div>
    );
  }

  const label = t("connections.statusMcpConnected");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2.5"
        data-testid="connection-row"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md border bg-background p-1">
            <ConnectorBrandIcon
              provider={provider as ConnectorProvider}
              className="size-4"
            />
          </div>
          <p className="truncate text-sm font-medium">{label}</p>
        </div>
        <ConnectionActions
          provider={provider as ConnectorProvider}
          reconnectHref={authorizeHref({
            connectorUid,
            accountId,
            projectId,
            returnTo,
          })}
          label={label}
          rowId={row.id}
          isPending={isPending}
          onDisconnect={onDisconnect}
        />
      </div>
    </div>
  );
}
