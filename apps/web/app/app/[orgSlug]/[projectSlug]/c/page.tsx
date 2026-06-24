import { redirect } from "next/navigation";
import { loadEndUserChatScope } from "@/lib/chat/server-scope";

export default async function AppChatIndexPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const scope = await loadEndUserChatScope(orgSlug, projectSlug);
  const latest = await scope.chat.latestThread();
  if (latest) {
    redirect(`${scope.chatBase}/${latest.id}`);
  }
  redirect(`${scope.chatBase}/new`);
}
