"use server";

import {
  enrichConnectInstallationDisplay,
  normalizeConnectInstallationId,
} from "@ssota/agent-runtime";
import { resolveApiAccountScope } from "@/lib/api/resolve-api-account-scope";
import { getAccountConnectionPort } from "@/lib/ports";
import { getCurrentUser } from "@/lib/supabase/server";
import { needsConnectionDisplayEnrichment } from "./display";

export async function enrichConnectionDisplayAction(input: {
  projectId: string;
  accountId: string;
  connectionId: string;
}): Promise<{
  name: string | null;
  tenantId: string | null;
  installationId?: string;
} | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  await resolveApiAccountScope(input.projectId, {
    requestedAccountId: input.accountId,
  });

  const port = getAccountConnectionPort();
  const row = await port.getById(input.connectionId, input.accountId);
  if (!row) return null;

  if (!needsConnectionDisplayEnrichment(row)) {
    return { name: row.name, tenantId: row.tenantId };
  }

  const installationId =
    normalizeConnectInstallationId(row.installationId) ??
    normalizeConnectInstallationId(row.tenantId);

  const enriched = await enrichConnectInstallationDisplay({
    connector: row.connector,
    installation: {
      installationId,
      tenantId: row.tenantId ?? undefined,
      name: row.name ?? undefined,
    },
    scope: {
      projectId: row.projectId,
      accountId: input.accountId,
      userId: row.subjectUserId ?? user.id,
      ...(installationId ? { installationId } : {}),
    },
  });

  const name = enriched.name?.trim() ?? null;
  const tenantId =
    normalizeConnectInstallationId(enriched.tenantId) ?? row.tenantId;
  const discoveredInstallationId = normalizeConnectInstallationId(
    enriched.installationId,
  );
  const shouldPatchInstallationId =
    Boolean(discoveredInstallationId) &&
    !normalizeConnectInstallationId(row.installationId);

  if (name || (tenantId && !row.tenantId) || shouldPatchInstallationId) {
    await port.updateDisplayMetadata(input.connectionId, input.accountId, {
      ...(name ? { name } : {}),
      ...(tenantId && !row.tenantId ? { tenantId } : {}),
      ...(shouldPatchInstallationId
        ? { installationId: discoveredInstallationId ?? null }
        : {}),
    });
  }

  return {
    name,
    tenantId: tenantId ?? row.tenantId,
    installationId: shouldPatchInstallationId
      ? (discoveredInstallationId ?? row.installationId)
      : row.installationId,
  };
}
