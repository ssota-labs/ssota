import type { UIMessage } from "ai";
import { notFound } from "next/navigation";
import { ChatConversation } from "@/components/chat/chat-conversation";
import { getConnectors } from "@/lib/connect/connectors";
import { loadBuilderChatScope } from "@/lib/chat/server-scope";

export default async function ChatThreadPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string; threadId: string }>;
}) {
  const { orgSlug, projectSlug, threadId } = await params;
  const scope = await loadBuilderChatScope(orgSlug, projectSlug);
  const thread = await scope.chat.getThread(threadId);
  if (!thread) {
    notFound();
  }

  const stored = await scope.chat.listMessages(thread.id);
  const initialMessages: UIMessage[] = stored.map((m) => ({
    id: m.id,
    role: m.role === "assistant" ? "assistant" : "user",
    parts: (m.parts.length > 0
      ? m.parts
      : [{ type: "text", text: "" }]) as UIMessage["parts"],
  }));

  const connectors = getConnectors().map((c) => ({
    provider: c.provider,
    connectorUid: c.connectorUid,
  }));

  return (
    <ChatConversation
      key={thread.id}
      projectId={scope.projectId}
      accountId={scope.accountId}
      threadId={thread.id}
      initialMessages={initialMessages}
      connectors={connectors}
      returnTo={scope.chatBase}
      orgSlug={orgSlug}
      projectSlug={projectSlug}
    />
  );
}
