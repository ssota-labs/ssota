import type { UIMessage } from "ai";
import { ChatWindow } from "@/components/chat/chat-window";
import { getConnectors } from "@/lib/connect/connectors";
import { projectPath } from "@/lib/console/paths";
import { resolveProject } from "@/lib/console/resolve-project";
import { getChatPort, getOrCreateProjectAccount } from "@/lib/ports";

export default async function ChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
  searchParams: Promise<{ thread?: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const { thread: requestedThreadId } = await searchParams;
  const ctx = { orgSlug, projectSlug };
  const { project } = await resolveProject(orgSlug, projectSlug);

  const account = await getOrCreateProjectAccount(project.id);
  const chat = getChatPort(project.id, account.id);

  // Load the thread list for the history sidebar, then resolve the active
  // thread: an explicit `?thread=` selection, else the latest, else a new one.
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
  // A freshly created fallback thread isn't in the list yet — surface it so the
  // sidebar highlights the active conversation.
  if (!threadSummaries.some((t) => t.id === active.id)) {
    threadSummaries.unshift({
      id: active.id,
      title: active.title,
      updatedAt: active.updatedAt.toISOString(),
    });
  }

  return (
    <ChatWindow
      key={active.id}
      projectId={project.id}
      accountId={account.id}
      threadId={active.id}
      initialMessages={initialMessages}
      connectors={connectors}
      returnTo={projectPath(ctx, "chat")}
      threads={threadSummaries}
      orgSlug={orgSlug}
      projectSlug={projectSlug}
      chatPath={projectPath(ctx, "chat")}
    />
  );
}
