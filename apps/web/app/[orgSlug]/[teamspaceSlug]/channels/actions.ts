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

function parseCredentialOnlyWorkspaceId(workspaceId: string): string | null {
  if (!workspaceId.startsWith("credential:")) return null;
  const connectionId = workspaceId.slice("credential:".length).trim();
  return connectionId || null;
}

/**
 * Disconnect one inbound workspace: revoke its Connect grant, remove the
 * matching `account_connections` row, and unlink `chat_workspaces` when linked.
 */
export async function disconnectInboundChannelWorkspaceAction(input: {
  teamspaceId: string;
  platform: InboundChannelPlatform;
  workspaceId: string;
  connectionId: string | null;
  revalidate: string;
}): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const account = await getOrCreateProjectAccount(input.teamspaceId);
  const connectionPort = getAccountConnectionPort();
  const workspacePort = getChatWorkspacePort();

  const credentialOnlyId = parseCredentialOnlyWorkspaceId(input.workspaceId);
  const chatWorkspaceId = credentialOnlyId ? null : input.workspaceId;
  let connectionId = input.connectionId ?? credentialOnlyId;

  if (chatWorkspaceId) {
    const workspaces = await workspacePort.list(input.teamspaceId);
    const workspace = workspaces.find((row) => row.id === chatWorkspaceId);
    if (!workspace || workspace.platform !== input.platform) {
      throw new Error("Workspace not found");
    }

    if (!connectionId) {
      const connections = await connectionPort.list(account.id);
      const match = connections.find(
        (row) =>
          providerOfInboundChannel(row.connector) === input.platform &&
          (row.tenantId === workspace.workspaceKey ||
            normalizeInstallationId(row.installationId) === workspace.workspaceKey),
      );
      connectionId = match?.id ?? null;
    }

    await workspacePort.unlink(chatWorkspaceId, input.teamspaceId);
  }

  if (connectionId) {
    const connection = await connectionPort.getById(connectionId, account.id);
    if (
      connection &&
      providerOfInboundChannel(connection.connector) === input.platform
    ) {
      await revokeConnectAuthorization(connection.connector, {
        teamspaceId: input.teamspaceId,
        accountId: account.id,
        userId: connection.subjectUserId ?? user.id,
        installationId: normalizeInstallationId(connection.installationId),
      });
      await connectionPort.remove(connection.id, account.id);
    }
  }

  revalidatePath(input.revalidate);
}

/** @deprecated Prefer disconnectInboundChannelWorkspaceAction per workspace row. */
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
