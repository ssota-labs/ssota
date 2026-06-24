"use client";

import type { UIMessage } from "ai";
import { ChatConversation } from "./chat-conversation";
import {
  ChatHistorySidebar,
  type ThreadSummary,
} from "./chat-history-sidebar";
import type { ConnectorOption } from "./connect-card";

interface ChatWindowProps {
  projectId: string;
  accountId: string;
  threadId: string;
  initialMessages: UIMessage[];
  connectors: ConnectorOption[];
  returnTo: string;
  threads: ThreadSummary[];
  orgSlug: string;
  projectSlug: string;
  chatPath: string;
}

/** @deprecated Use ChatRouteShell layout + ChatConversation page instead. */
export function ChatWindow({
  projectId,
  accountId,
  threadId,
  initialMessages,
  connectors,
  returnTo,
  threads,
  orgSlug,
  projectSlug,
  chatPath,
}: ChatWindowProps) {
  return (
    <div className="flex h-full min-h-0">
      <ChatHistorySidebar
        threads={threads}
        chatBase={chatPath}
        orgSlug={orgSlug}
        projectSlug={projectSlug}
        appMode={chatPath.startsWith("/app/")}
      />
      <ChatConversation
        projectId={projectId}
        accountId={accountId}
        threadId={threadId}
        initialMessages={initialMessages}
        connectors={connectors}
        returnTo={returnTo}
        orgSlug={orgSlug}
        projectSlug={projectSlug}
      />
    </div>
  );
}
