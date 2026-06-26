import type { ConnectorProvider } from "@/lib/connect/connectors";

export interface ConnectionDisplayRow {
  installationId: string;
  tenantId: string | null;
  name: string | null;
}

const TWITTER_HANDLE_IN_NAME = /\(@([A-Za-z0-9_]+)\)\s*$/;

export function connectionInstallationId(
  row: ConnectionDisplayRow,
): string | undefined {
  const id = row.installationId?.trim();
  if (!id || id.toLowerCase() === "empty") return undefined;
  return id;
}

export function connectionDisplayLabel(
  row: ConnectionDisplayRow,
  provider?: ConnectorProvider,
): string {
  const raw =
    row.name?.trim() ||
    row.tenantId?.trim() ||
    connectionInstallationId(row) ||
    "Connected";

  if (provider === "twitter") {
    return stripTwitterHandleFromDisplayName(raw);
  }

  return raw;
}

/** True when a provider API lookup may fill a human-readable workspace name. */
export function needsConnectionDisplayEnrichment(
  row: ConnectionDisplayRow,
): boolean {
  return !row.name?.trim();
}

/**
 * Secondary line under the connection title (e.g. Slack team id, X @handle).
 * X stores the numeric user id in tenantId — show @handle parsed from name instead.
 */
export function connectionDisplaySubtitle(
  row: ConnectionDisplayRow,
  provider: ConnectorProvider,
): string | null {
  if (!row.name?.trim()) return null;

  if (provider === "twitter") {
    const handle = extractTwitterHandleFromName(row.name);
    if (handle) return `@${handle}`;
    const tenant = row.tenantId?.trim();
    if (tenant && !/^\d+$/.test(tenant)) {
      return tenant.startsWith("@") ? tenant : `@${tenant}`;
    }
    return null;
  }

  return row.tenantId?.trim() || null;
}

function extractTwitterHandleFromName(name: string): string | null {
  const parenMatch = name.match(TWITTER_HANDLE_IN_NAME);
  if (parenMatch?.[1]) return parenMatch[1];

  const atMatch = name.trim().match(/^@([A-Za-z0-9_]+)$/);
  return atMatch?.[1] ?? null;
}

/** Title line for X — omits trailing " (@handle)" when stored in name. */
function stripTwitterHandleFromDisplayName(name: string): string {
  const trimmed = name.trim();
  const withoutParenHandle = trimmed.replace(TWITTER_HANDLE_IN_NAME, "").trim();
  if (withoutParenHandle) return withoutParenHandle;

  const handle = extractTwitterHandleFromName(trimmed);
  if (handle && trimmed === `@${handle}`) return `@${handle}`;

  return trimmed;
}
