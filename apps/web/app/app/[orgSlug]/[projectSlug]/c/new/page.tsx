import { redirect } from "next/navigation";
import { loadEndUserChatScope } from "@/lib/chat/server-scope";

export default async function AppNewChatPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const scope = await loadEndUserChatScope(orgSlug, projectSlug);
  const thread = await scope.chat.createThread();
  redirect(`${scope.chatBase}/${thread.id}`);
}
