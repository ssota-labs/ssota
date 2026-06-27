import { redirect } from "next/navigation";
import { loadBuilderChatScope } from "@/lib/chat/server-scope";

export default async function NewChatPage({
  params,
}: {
  params: Promise<{ orgSlug: string; teamspaceSlug: string }>;
}) {
  const { orgSlug, teamspaceSlug } = await params;
  const scope = await loadBuilderChatScope(orgSlug, teamspaceSlug);
  const thread = await scope.chat.createThread();
  redirect(`${scope.chatBase}/${thread.id}`);
}
