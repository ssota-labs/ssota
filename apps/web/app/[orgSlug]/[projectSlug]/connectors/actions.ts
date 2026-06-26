"use server";

import { revalidatePath } from "next/cache";
import { disconnectComposioAccount } from "@ssota/agent-runtime";
import { getCurrentUser } from "@/lib/supabase/server";

/**
 * Disconnect a single Composio connected account. The connection id is the
 * Composio connected-account id surfaced by the Connectors page. Composio owns
 * the credential, so deleting the connected account is the whole operation.
 */
export async function disconnectConnectionAction(input: {
  projectId: string;
  connectionId: string;
  revalidate: string;
}): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  await disconnectComposioAccount(input.connectionId);
  revalidatePath(input.revalidate);
}
