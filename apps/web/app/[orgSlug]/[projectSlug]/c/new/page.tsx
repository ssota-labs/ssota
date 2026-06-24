import { redirect } from "next/navigation";
import { loadBuilderChatScope } from "@/lib/chat/server-scope";

export default async function NewChatPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const scope = await loadBuilderChatScope(orgSlug, projectSlug);
  const thread = await scope.chat.createThread();
  redirect(`${scope.chatBase}/${thread.id}`);
}
