import { redirect } from "next/navigation";
import { loadEndUserChatScope } from "@/lib/chat/server-scope";

export default async function AppNewChatPage({
  params,
}: {
  params: Promise<{ orgSlug: string; teamspaceSlug: string }>;
}) {
  const { orgSlug, teamspaceSlug } = await params;
  const scope = await loadEndUserChatScope(orgSlug, teamspaceSlug);
  const thread = await scope.chat.createThread();
  redirect(`${scope.chatBase}/${thread.id}`);
}
