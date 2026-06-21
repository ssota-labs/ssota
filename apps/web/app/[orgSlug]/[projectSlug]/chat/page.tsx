import type { UIMessage } from "ai";
import { ChatWindow } from "@/components/chat/chat-window";
import { getConnectors } from "@/lib/connect/connectors";
import { projectPath } from "@/lib/console/paths";
import { resolveProject } from "@/lib/console/resolve-project";
import { getChatPort, getOrCreateProjectAccount } from "@/lib/ports";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const ctx = { orgSlug, projectSlug };
  const { project } = await resolveProject(orgSlug, projectSlug);

  const account = await getOrCreateProjectAccount(project.id);
  const chat = getChatPort(project.id, account.id);

  const thread = (await chat.latestThread()) ?? (await chat.createThread());
  const stored = await chat.listMessages(thread.id);

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
    <ChatWindow
      projectId={project.id}
      accountId={account.id}
      threadId={thread.id}
      initialMessages={initialMessages}
      connectors={connectors}
      returnTo={projectPath(ctx, "chat")}
    />
  );
}
