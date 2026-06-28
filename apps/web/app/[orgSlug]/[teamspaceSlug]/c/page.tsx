import { redirect } from "next/navigation";
import { loadBuilderChatScope } from "@/lib/chat/server-scope";

export default async function ChatIndexPage({
  params,
}: {
  params: Promise<{ orgSlug: string; teamspaceSlug: string }>;
}) {
  const { orgSlug, teamspaceSlug } = await params;
  const scope = await loadBuilderChatScope(orgSlug, teamspaceSlug);
  const latest = await scope.chat.latestThread();
  if (latest) {
    redirect(`${scope.chatBase}/${latest.id}`);
  }
  redirect(`${scope.chatBase}/new`);
}
