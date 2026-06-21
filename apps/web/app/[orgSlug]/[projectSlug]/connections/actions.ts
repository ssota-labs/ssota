"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/supabase/server";
import {
  getAccountConnectionPort,
  getChatWorkspacePort,
  getOrCreateProjectAccount,
} from "@/lib/ports";

/**
 * Disconnect a single connection (one workspace/installation). The account is
 * resolved server-side from the project so the client cannot target another
 * account's rows.
 */
export async function disconnectConnectionAction(input: {
  projectId: string;
  connectionId: string;
  revalidate: string;
}): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const account = await getOrCreateProjectAccount(input.projectId);
  await getAccountConnectionPort().remove(input.connectionId, account.id);
  revalidatePath(input.revalidate);
}

/**
 * Link a chat workspace (Slack team / Discord guild / Telegram chat) to this
 * project, so inbound messages from it route to this project's agent. This is
 * the UI for the workspace→project mapping (replaces the raw /api/chat/link
 * call). Idempotent on workspaceKey.
 */
export async function linkChatWorkspaceAction(input: {
  projectId: string;
  platform: string;
  workspaceKey: string;
  name?: string;
  revalidate: string;
}): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const workspaceKey = input.workspaceKey.trim();
  if (!workspaceKey) throw new Error("Workspace id is required");

  await getChatWorkspacePort().link({
    projectId: input.projectId,
    platform: input.platform,
    workspaceKey,
    name: input.name?.trim() || null,
  });
  revalidatePath(input.revalidate);
}

/** Unlink a chat workspace from this project (scoped to the project). */
export async function unlinkChatWorkspaceAction(input: {
  projectId: string;
  id: string;
  revalidate: string;
}): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  await getChatWorkspacePort().unlink(input.id, input.projectId);
  revalidatePath(input.revalidate);
}
