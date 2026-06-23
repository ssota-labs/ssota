"use server";

import { revalidatePath } from "next/cache";
import { revokeConnectAuthorization } from "@ssota/agent-runtime";
import { getCurrentUser } from "@/lib/supabase/server";
import {
  getAccountConnectionPort,
  getOrCreateProjectAccount,
} from "@/lib/ports";

/**
 * Disconnect a single connection (one workspace/installation). The account is
 * resolved server-side from the project so the client cannot target another
 * account's rows.
 *
 * Revokes the Connect-side grant before deleting the local row: otherwise the
 * grant survives and reconnecting re-uses the existing installation without a
 * fresh OAuth consent, so newly-added provider scopes (e.g. Slack MCP) never
 * reach the token. Revoke is best-effort — the local unlink proceeds regardless.
 */
export async function disconnectConnectionAction(input: {
  projectId: string;
  connectionId: string;
  revalidate: string;
}): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const account = await getOrCreateProjectAccount(input.projectId);
  const port = getAccountConnectionPort();

  const row = await port.getById(input.connectionId, account.id);
  if (row) {
    await revokeConnectAuthorization(row.connector, {
      projectId: input.projectId,
      accountId: account.id,
      ...(row.installationId ? { installationId: row.installationId } : {}),
      ...(row.subjectUserId ? { userId: row.subjectUserId } : {}),
    });
  }

  await port.remove(input.connectionId, account.id);
  revalidatePath(input.revalidate);
}
