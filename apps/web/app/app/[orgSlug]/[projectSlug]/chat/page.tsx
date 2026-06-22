import type { UIMessage } from "ai";
import { ChatWindow } from "@/components/chat/chat-window";
import { getConnectors } from "@/lib/connect/connectors";
import { appProjectPath } from "@/lib/console/app-paths";
import { resolveEndUserContext } from "@/lib/request-context";
import { getChatPort } from "@/lib/ports";

export default async function AppChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
  searchParams: Promise<{ thread?: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const { thread: requestedThreadId } = await searchParams;
  const ctx = await resolveEndUserContext(orgSlug, projectSlug);
  const routeCtx = { orgSlug, projectSlug };
  const chat = getChatPort(ctx.projectId, ctx.accountId);

  const threads = await chat.listThreads();
  const active =
    (requestedThreadId
      ? threads.find((t) => t.id === requestedThreadId)
      : undefined) ??
    threads[0] ??
    (await chat.createThread());

  const stored = await chat.listMessages(active.id);

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

  const threadSummaries = threads.map((t) => ({
    id: t.id,
    title: t.title,
    updatedAt: t.updatedAt.toISOString(),
  }));
  if (!threadSummaries.some((t) => t.id === active.id)) {
    threadSummaries.unshift({
      id: active.id,
      title: active.title,
      updatedAt: active.updatedAt.toISOString(),
    });
  }

  const chatPath = appProjectPath(routeCtx, "chat");

  return (
    <ChatWindow
      key={active.id}
      projectId={ctx.projectId}
      accountId={ctx.accountId}
      threadId={active.id}
      initialMessages={initialMessages}
      connectors={connectors}
      returnTo={chatPath}
      threads={threadSummaries}
      orgSlug={orgSlug}
      projectSlug={projectSlug}
      chatPath={chatPath}
    />
  );
}
