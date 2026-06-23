export interface ConnectionDisplayRow {
  installationId: string;
  tenantId: string | null;
  name: string | null;
}

export function connectionInstallationId(
  row: ConnectionDisplayRow,
): string | undefined {
  const id = row.installationId?.trim();
  if (!id || id.toLowerCase() === "empty") return undefined;
  return id;
}

export function connectionDisplayLabel(row: ConnectionDisplayRow): string {
  return (
    row.name?.trim() ||
    row.tenantId?.trim() ||
    connectionInstallationId(row) ||
    "Connected"
  );
}

/** True when a provider API lookup may fill a human-readable workspace name. */
export function needsConnectionDisplayEnrichment(
  row: ConnectionDisplayRow,
): boolean {
  return !row.name?.trim();
}
