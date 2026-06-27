"use client";

import { buttonVariants } from "@ssota/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ssota/ui/components/ui/card";
import { ConnectorBrandIcon } from "@/components/connections/connector-brand-icon";
import type { ConnectorProvider } from "@/lib/connect/connectors";

const KNOWN_PROVIDERS = new Set<ConnectorProvider>([
  "slack",
  "notion",
  "github",
  "discord",
  "linear",
]);

function asConnectorProvider(value: string): ConnectorProvider | null {
  return KNOWN_PROVIDERS.has(value as ConnectorProvider)
    ? (value as ConnectorProvider)
    : null;
}

export interface ConnectorOption {
  provider: string;
  connectorUid: string | null;
}

export interface ConnectionRequest {
  connector: string;
  reason?: string;
  teamspaceId: string;
  accountId: string | null;
}

/**
 * Rendered inline in chat when the agent calls `request_connection` (a missing
 * credential). Resolves the agent-supplied connector (a bare provider like
 * "slack" or a full "slack/acme" uid) to the deployment's configured connector
 * uid and links to the standard `/api/connect/authorize` flow.
 */
export function ConnectCard({
  request,
  connectors,
  returnTo,
}: {
  request: ConnectionRequest;
  connectors: ConnectorOption[];
  returnTo: string;
}) {
  const connectorUid = resolveConnectorUid(request.connector, connectors);
  const provider = request.connector.split("/")[0] ?? request.connector;
  const brandProvider = asConnectorProvider(provider);
  const label = provider.charAt(0).toUpperCase() + provider.slice(1);

  const href =
    connectorUid && request.accountId
      ? `/api/connect/authorize?${new URLSearchParams({
          connector: connectorUid,
          accountId: request.accountId,
          teamspaceId: request.teamspaceId,
          returnTo,
        }).toString()}`
      : null;

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {brandProvider ? (
            <span className="flex size-7 items-center justify-center rounded-md border bg-muted/50 p-1">
              <ConnectorBrandIcon provider={brandProvider} className="size-4" />
            </span>
          ) : null}
          Connect {label}
        </CardTitle>
        {request.reason ? (
          <CardDescription>{request.reason}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent>
        {href ? (
          <a className={buttonVariants({ size: "sm" })} href={href}>
            Connect {label}
          </a>
        ) : (
          <p className="text-sm text-muted-foreground">
            {label} is not configured for this deployment.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function resolveConnectorUid(
  connector: string,
  connectors: ConnectorOption[],
): string | null {
  if (connector.includes("/")) return connector;
  const match = connectors.find((c) => c.provider === connector);
  return match?.connectorUid ?? null;
}
