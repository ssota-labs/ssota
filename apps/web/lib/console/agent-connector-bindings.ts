import type { AgentConnectorBinding } from "@ssota/contracts";
import type { ConnectorConnection } from "@/components/connectors/connectors-view";
import type { ConnectorConnectScope } from "@/lib/connect/authorize-href";

export type ScopedConnection = ConnectorConnection & {
  scope: ConnectorConnectScope;
};

export function connectorBindingKey(
  scope: ConnectorConnectScope,
  connectionId: string,
): string {
  return `${scope}:${connectionId}`;
}

export function flattenScopedConnections(connections: {
  user: ConnectorConnection[];
  org: ConnectorConnection[];
}): ScopedConnection[] {
  return [
    ...connections.user.map((c) => ({ ...c, scope: "user" as const })),
    ...connections.org.map((c) => ({ ...c, scope: "org" as const })),
  ];
}

export function scopedConnectionsForProvider(
  connections: { user: ConnectorConnection[]; org: ConnectorConnection[] },
  provider: string,
): { user: ScopedConnection[]; org: ScopedConnection[] } {
  return {
    user: connections.user
      .filter((c) => c.connector === provider)
      .map((c) => ({ ...c, scope: "user" as const })),
    org: connections.org
      .filter((c) => c.connector === provider)
      .map((c) => ({ ...c, scope: "org" as const })),
  };
}

export function connectionDisplayLabel(
  connection: Pick<ConnectorConnection, "name" | "connector">,
  providerLabel?: string,
): string {
  const trimmed = connection.name?.trim();
  if (trimmed) return trimmed;
  return providerLabel ?? connection.connector;
}

export function isConnectorBound(
  bindings: AgentConnectorBinding[],
  scope: ConnectorConnectScope,
  connectionId: string,
): boolean {
  return bindings.some(
    (b) => b.scope === scope && b.connectionId === connectionId,
  );
}

/** Legacy runPolicy → explicit bindings using current connections. */
export function migrateConnectorBindings(
  enabledConnectorProviders: string[],
  connections: { user: ConnectorConnection[]; org: ConnectorConnection[] },
  existing?: AgentConnectorBinding[],
): AgentConnectorBinding[] {
  if (existing && existing.length > 0) {
    return existing;
  }
  if (enabledConnectorProviders.length === 0) {
    return [];
  }
  const providerSet = new Set(enabledConnectorProviders);
  return flattenScopedConnections(connections)
    .filter((c) => providerSet.has(c.connector))
    .map((c) => ({
      connectionId: c.id,
      provider: c.connector,
      scope: c.scope,
      accountLabel: c.name?.trim() || undefined,
    }));
}

export function deriveEnabledProvidersFromBindings(
  bindings: AgentConnectorBinding[],
): string[] {
  return [...new Set(bindings.map((b) => b.provider))].sort();
}

export function addConnectorBinding(
  bindings: AgentConnectorBinding[],
  connection: ScopedConnection,
  providerLabel?: string,
): AgentConnectorBinding[] {
  if (isConnectorBound(bindings, connection.scope, connection.id)) {
    return bindings;
  }
  return [
    ...bindings,
    {
      connectionId: connection.id,
      provider: connection.connector,
      scope: connection.scope,
      accountLabel:
        connection.name?.trim() ||
        (providerLabel && providerLabel !== connection.connector
          ? providerLabel
          : undefined),
    },
  ];
}

export function removeConnectorBinding(
  bindings: AgentConnectorBinding[],
  scope: ConnectorConnectScope,
  connectionId: string,
): AgentConnectorBinding[] {
  return bindings.filter(
    (b) => !(b.scope === scope && b.connectionId === connectionId),
  );
}
