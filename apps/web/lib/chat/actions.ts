"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  loadBuilderChatScope,
  loadEndUserChatScope,
} from "@/lib/chat/server-scope";
import { getCurrentUser } from "@/lib/supabase/server";

const deleteChatThreadInputSchema = z.object({
  orgSlug: z.string().min(1),
  projectSlug: z.string().min(1),
  threadId: z.string().uuid(),
  appMode: z.boolean(),
  chatBase: z.string().min(1),
});

/** Delete a chat thread and its messages for the resolved project account. */
export async function deleteChatThreadAction(
  input: z.infer<typeof deleteChatThreadInputSchema>,
): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const parsed = deleteChatThreadInputSchema.parse(input);
  const scope = parsed.appMode
    ? await loadEndUserChatScope(parsed.orgSlug, parsed.projectSlug)
    : await loadBuilderChatScope(parsed.orgSlug, parsed.projectSlug);

  const deleted = await scope.chat.deleteThread(parsed.threadId);
  if (!deleted) throw new Error("Thread not found");

  revalidatePath(parsed.chatBase, "layout");
}
