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
}): Promise<{ name: string | null; tenantId: string | null } | null> {
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
  const tenantId = enriched.tenantId?.trim() ?? null;

  if (name || (tenantId && !row.tenantId)) {
    await port.updateDisplayMetadata(input.connectionId, input.accountId, {
      ...(name ? { name } : {}),
      ...(tenantId && !row.tenantId ? { tenantId } : {}),
    });
  }

  return { name, tenantId: tenantId ?? row.tenantId };
}
