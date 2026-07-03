"use server";

import { revalidatePath } from "next/cache";
import { revokeConnectAuthorization } from "@ssota/agent-runtime";
import {
  providerOfInboundChannel,
  type InboundChannelPlatform,
} from "@/lib/connect/inbound-channels";
import {
  getAccountConnectionPort,
  getChatWorkspacePort,
  getOrCreateProjectAccount,
} from "@/lib/ports";
import { getCurrentUser } from "@/lib/supabase/server";

function normalizeInstallationId(
  installationId: string | null | undefined,
): string | undefined {
  if (!installationId) return undefined;
  const trimmed = installationId.trim();
  if (!trimmed || trimmed.toLowerCase() === "empty") return undefined;
  return trimmed;
}

/**
 * Disconnect an inbound channel (Slack/Discord): revoke Vercel Connect grants,
 * remove account_connections rows, and unlink chat_workspaces for the platform.
 */
export async function disconnectInboundChannelAction(input: {
  teamspaceId: string;
  platform: InboundChannelPlatform;
  revalidate: string;
}): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const account = await getOrCreateProjectAccount(input.teamspaceId);
  const connectionPort = getAccountConnectionPort();
  const workspacePort = getChatWorkspacePort();

  const connections = await connectionPort.list(account.id);
  const matching = connections.filter(
    (row) => providerOfInboundChannel(row.connector) === input.platform,
  );

  for (const conn of matching) {
    await revokeConnectAuthorization(conn.connector, {
      teamspaceId: input.teamspaceId,
      accountId: account.id,
      userId: conn.subjectUserId ?? user.id,
      installationId: normalizeInstallationId(conn.installationId),
    });
    await connectionPort.remove(conn.id, account.id);
  }

  const workspaces = await workspacePort.list(input.teamspaceId);
  for (const workspace of workspaces) {
    if (workspace.platform !== input.platform) continue;
    await workspacePort.unlink(workspace.id, input.teamspaceId);
  }

  revalidatePath(input.revalidate);
}
