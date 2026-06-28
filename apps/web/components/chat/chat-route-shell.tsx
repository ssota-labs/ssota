"use client";

import type { ReactNode } from "react";
import {
  ChatHistorySidebar,
  type ThreadSummary,
} from "./chat-history-sidebar";

interface ChatRouteShellProps {
  children: ReactNode;
  threads: ThreadSummary[];
  chatBase: string;
  orgSlug: string;
  teamspaceSlug: string;
  appMode: boolean;
}

export function ChatRouteShell({
  children,
  threads,
  chatBase,
  orgSlug,
  teamspaceSlug,
  appMode,
}: ChatRouteShellProps) {
  return (
    <div className="flex h-full min-h-0">
      <ChatHistorySidebar
        threads={threads}
        chatBase={chatBase}
        orgSlug={orgSlug}
        teamspaceSlug={teamspaceSlug}
        appMode={appMode}
      />
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
