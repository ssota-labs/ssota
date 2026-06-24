import { ChatRouteShell } from "@/components/chat/chat-route-shell";
import { loadEndUserChatScope } from "@/lib/chat/server-scope";

export default async function AppChatLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const scope = await loadEndUserChatScope(orgSlug, projectSlug);
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
      projectSlug={projectSlug}
      appMode
    >
      {children}
    </ChatRouteShell>
  );
}
