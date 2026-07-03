"use server";

import { revalidatePath } from "next/cache";
import { revokeConnectAuthorization } from "@ssota/agent-runtime";
import { finalizeVercelConnect } from "@/lib/connect/finalize-vercel-connect";
import { resolveApiAccountScope } from "@/lib/api/resolve-api-account-scope";
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

function stubInstallationId(connectorUid: string, userId: string): string {
  const slug = connectorUid.replace(/[^a-zA-Z0-9]/g, "-");
  const suffix = Math.abs(
    [...`${connectorUid}:${userId}:${Date.now()}`].reduce(
      (acc, ch) => (acc * 31 + ch.charCodeAt(0)) | 0,
      7,
    ),
  )
    .toString(36)
    .slice(0, 6);
  return `stub-${slug}-${suffix}`;
}

/**
 * Dev-only: record a synthetic inbound workspace when CONNECT_STUB=1 (no OAuth).
 */
export async function addInboundChannelWorkspaceStubAction(input: {
  teamspaceId: string;
  accountId: string;
  connectorUid: string;
  revalidate: string;
}): Promise<void> {
  if (process.env.CONNECT_STUB !== "1") {
    throw new Error("Stub connect is not enabled");
  }

  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  await resolveApiAccountScope(input.teamspaceId, {
    requestedAccountId: input.accountId,
  });

  await finalizeVercelConnect({
    connector: input.connectorUid,
    teamspaceId: input.teamspaceId,
    accountId: input.accountId,
    userId: user.id,
    installationId: stubInstallationId(input.connectorUid, user.id),
  });

  revalidatePath(input.revalidate);
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
