import { unstable_noStore as noStore } from "next/cache";
import { ChatRouteShell } from "@/components/chat/chat-route-shell";
import { loadEndUserChatScope } from "@/lib/chat/server-scope";

export default async function AppChatLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string; teamspaceSlug: string }>;
}) {
  noStore();
  const { orgSlug, teamspaceSlug } = await params;
  const scope = await loadEndUserChatScope(orgSlug, teamspaceSlug);
  const threads = await scope.chat.listThreads();
  const threadSummaries = threads.map((t) => ({
    id: t.id,
    title: t.title,
    updatedAt: t.updatedAt.toISOString(),
  }));

  return (
    <ChatRouteShell
      threads={threadSummaries}
      chatBase={scope.chatBase}
      orgSlug={orgSlug}
      teamspaceSlug={teamspaceSlug}
      appMode
    >
      {children}
    </ChatRouteShell>
  );
}
