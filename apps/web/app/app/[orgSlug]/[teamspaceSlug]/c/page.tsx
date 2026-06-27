import { redirect } from "next/navigation";
import { loadEndUserChatScope } from "@/lib/chat/server-scope";

export default async function AppChatIndexPage({
  params,
}: {
  params: Promise<{ orgSlug: string; teamspaceSlug: string }>;
}) {
  const { orgSlug, teamspaceSlug } = await params;
  const scope = await loadEndUserChatScope(orgSlug, teamspaceSlug);
  const latest = await scope.chat.latestThread();
  if (latest) {
    redirect(`${scope.chatBase}/${latest.id}`);
  }
  redirect(`${scope.chatBase}/new`);
}
