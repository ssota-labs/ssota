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
  teamspaceSlug: z.string().min(1),
  threadId: z.string().uuid(),
  appMode: z.boolean(),
  chatBase: z.string().min(1),
});

const createChatThreadInputSchema = z.object({
  orgSlug: z.string().min(1),
  teamspaceSlug: z.string().min(1),
  appMode: z.boolean(),
  chatBase: z.string().min(1),
  title: z.string().max(120).optional(),
});

/** Delete a chat thread and its messages for the resolved project account. */
export async function deleteChatThreadAction(
  input: z.infer<typeof deleteChatThreadInputSchema>,
): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const parsed = deleteChatThreadInputSchema.parse(input);
  const scope = parsed.appMode
    ? await loadEndUserChatScope(parsed.orgSlug, parsed.teamspaceSlug)
    : await loadBuilderChatScope(parsed.orgSlug, parsed.teamspaceSlug);

  const deleted = await scope.chat.deleteThread(parsed.threadId);
  if (!deleted) throw new Error("Thread not found");

  revalidatePath(parsed.chatBase, "layout");
}

/** Create a chat thread for the resolved project account. */
export async function createChatThreadAction(
  input: z.infer<typeof createChatThreadInputSchema>,
): Promise<{ id: string; title: string }> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const parsed = createChatThreadInputSchema.parse(input);
  const scope = parsed.appMode
    ? await loadEndUserChatScope(parsed.orgSlug, parsed.teamspaceSlug)
    : await loadBuilderChatScope(parsed.orgSlug, parsed.teamspaceSlug);

  const thread = await scope.chat.createThread(parsed.title);
  revalidatePath(parsed.chatBase, "layout");

  return { id: thread.id, title: thread.title };
}
