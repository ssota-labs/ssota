"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect, useOptimistic, useState, useTransition } from "react";
import {
  PlusIcon,
  ChatCircleIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { Button } from "@ssota/ui/components/ui/button";
import { ScrollArea } from "@ssota/ui/components/ui/scroll-area";
import { cn } from "@ssota/ui/lib/utils";
import { deleteChatThreadAction } from "@/lib/chat/actions";

export interface ThreadSummary {
  id: string;
  title: string;
  updatedAt: string;
}

interface ChatHistorySidebarProps {
  threads: ThreadSummary[];
  chatBase: string;
  orgSlug: string;
  projectSlug: string;
  appMode: boolean;
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
 * Left rail listing past chat threads. Navigates via `/c/[threadId]` routes;
 * "새 채팅" goes to `/c/new` immediately (server creates the thread).
 */
export function ChatHistorySidebar({
  threads,
  chatBase,
  orgSlug,
  projectSlug,
  appMode,
}: ChatHistorySidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, startDelete] = useTransition();
  const [optimisticThreads, removeOptimisticThread] = useOptimistic(
    threads,
    (state, deletedId: string) => state.filter((t) => t.id !== deletedId),
  );

  const activeThreadId =
    typeof params.threadId === "string" ? params.threadId : undefined;

  useEffect(() => {
    setConfirmingId(null);
  }, [threads]);

  function newChat() {
    setError(null);
    setConfirmingId(null);
    router.push(`${chatBase}/new`);
  }

  function requestDelete(threadId: string) {
    setError(null);
    setConfirmingId(threadId);
  }

  function cancelDelete() {
    setConfirmingId(null);
  }

  function confirmDelete(threadId: string) {
    setError(null);
    setConfirmingId(null);

    const onDeletedThread =
      pathname === `${chatBase}/${threadId}` || activeThreadId === threadId;
    const remaining = threads.filter((t) => t.id !== threadId);

    startDelete(async () => {
      removeOptimisticThread(threadId);

      if (onDeletedThread) {
        const next = remaining[0];
        router.push(next ? `${chatBase}/${next.id}` : `${chatBase}/new`);
      }

      try {
        await deleteChatThreadAction({
          orgSlug,
          projectSlug,
          threadId,
          appMode,
          chatBase,
        });
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "채팅 삭제 실패");
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
          {optimisticThreads.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">
              아직 대화가 없습니다
            </p>
          ) : (
            optimisticThreads.map((thread) => {
              const isActive = thread.id === activeThreadId;
              const isConfirming = confirmingId === thread.id;
              return (
                <div
                  key={thread.id}
                  className={cn(
                    "group flex items-stretch gap-0.5 rounded-lg pr-1 transition-colors",
                    isActive
                      ? "bg-secondary text-secondary-foreground"
                      : "hover:bg-secondary/60",
                    isConfirming && "bg-destructive/5",
                  )}
                  onMouseLeave={() => {
                    if (isConfirming) cancelDelete();
                  }}
                >
                  <Link
                    href={`${chatBase}/${thread.id}`}
                    className="flex min-w-0 flex-1 flex-col gap-0.5 px-3 py-2 text-sm"
                    onClick={cancelDelete}
                  >
                    <span className="flex items-center gap-2 truncate font-medium">
                      <ChatCircleIcon className="size-3.5 shrink-0 opacity-60" />
                      <span className="truncate">{thread.title}</span>
                    </span>
                    <span className="pl-5 text-xs text-muted-foreground">
                      {formatWhen(thread.updatedAt)}
                    </span>
                  </Link>
                  {isConfirming ? (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="my-1 h-7 shrink-0 px-2 text-xs"
                      aria-label="삭제 확인"
                      disabled={isDeleting}
                      onClick={() => confirmDelete(thread.id)}
                    >
                      삭제
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="my-1 size-7 shrink-0 text-muted-foreground opacity-0 transition-[opacity,color,background-color] group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100"
                      aria-label="채팅 삭제"
                      disabled={isDeleting}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        requestDelete(thread.id);
                      }}
                    >
                      <TrashIcon className="size-3.5" />
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </nav>
      </ScrollArea>
    </aside>
  );
}
