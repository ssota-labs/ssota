"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/supabase/server";
import {
  getAccountConnectionPort,
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
