"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon, ChatCircleIcon } from "@phosphor-icons/react";
import { Button } from "@ssota/ui/components/ui/button";
import { ScrollArea } from "@ssota/ui/components/ui/scroll-area";
import { cn } from "@ssota/ui/lib/utils";

export interface ThreadSummary {
  id: string;
  title: string;
  updatedAt: string;
}

interface ChatHistorySidebarProps {
  threads: ThreadSummary[];
  activeThreadId: string;
  chatPath: string;
  orgSlug: string;
  projectSlug: string;
}

/** Relative "2h ago"-style label; falls back to a short date for older items. */
function formatWhen(iso: string): string {
  const then = new Date(iso).getTime();
  const diffMin = Math.round((Date.now() - then) / 60000);
  if (diffMin < 1) return "방금";
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}시간 전`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay}일 전`;
  return new Date(iso).toLocaleDateString();
}

/**
 * Left rail listing past chat threads. Clicking a thread navigates to
 * `?thread=<id>` (server re-loads that conversation); "새 채팅" creates a thread
 * via the API and navigates to it.
 */
export function ChatHistorySidebar({
  threads,
  activeThreadId,
  chatPath,
  orgSlug,
  projectSlug,
}: ChatHistorySidebarProps) {
  const router = useRouter();
  const [creating, startCreate] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function newChat() {
    setError(null);
    startCreate(async () => {
      try {
        const res = await fetch("/api/chat/thread", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ orgSlug, projectSlug }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const { thread } = (await res.json()) as { thread: { id: string } };
        router.push(`${chatPath}?thread=${thread.id}`);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "새 채팅 생성 실패");
      }
    });
  }

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r bg-muted/30">
      <div className="p-3">
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={newChat}
          disabled={creating}
        >
          <PlusIcon className="size-4" />
          새 채팅
        </Button>
        {error ? (
          <p className="mt-2 text-xs text-destructive">{error}</p>
        ) : null}
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <nav className="flex flex-col gap-0.5 px-2 pb-3">
          {threads.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">
              아직 대화가 없습니다
            </p>
          ) : (
            threads.map((thread) => {
              const isActive = thread.id === activeThreadId;
              return (
                <a
                  key={thread.id}
                  href={`${chatPath}?thread=${thread.id}`}
                  className={cn(
                    "group flex flex-col gap-0.5 rounded-lg px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-secondary text-secondary-foreground"
                      : "hover:bg-secondary/60",
                  )}
                >
                  <span className="flex items-center gap-2 truncate font-medium">
                    <ChatCircleIcon className="size-3.5 shrink-0 opacity-60" />
                    <span className="truncate">{thread.title}</span>
                  </span>
                  <span className="pl-5 text-xs text-muted-foreground">
                    {formatWhen(thread.updatedAt)}
                  </span>
                </a>
              );
            })
          )}
        </nav>
      </ScrollArea>
    </aside>
  );
}
