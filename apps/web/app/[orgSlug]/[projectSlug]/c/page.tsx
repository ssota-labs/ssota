import { redirect } from "next/navigation";
import { loadBuilderChatScope } from "@/lib/chat/server-scope";

export default async function ChatIndexPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const scope = await loadBuilderChatScope(orgSlug, projectSlug);
  const latest = await scope.chat.latestThread();
  if (latest) {
    redirect(`${scope.chatBase}/${latest.id}`);
  }
  redirect(`${scope.chatBase}/new`);
}
