"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useOptimistic, useState, useTransition } from "react";
import {
  PlusIcon,
  ChatCircleIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { Button } from "@ssota/ui/components/ui/button";
import { ScrollArea } from "@ssota/ui/components/ui/scroll-area";
import { cn } from "@ssota/ui/lib/utils";
import { deleteChatThreadAction } from "@/lib/chat/actions";
import { useLocale } from "@/components/i18n/locale-provider";

export interface ThreadSummary {
  id: string;
  title: string;
  updatedAt: string;
}

const PENDING_THREAD_PREFIX = "pending:";

type OptimisticThreadAction =
  | { type: "add"; thread: ThreadSummary }
  | { type: "delete"; id: string };

function isPendingThreadId(id: string): boolean {
  return id.startsWith(PENDING_THREAD_PREFIX);
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
 * "새 채팅" optimistically inserts a sidebar row and navigates to `/c/new`
 * immediately; the server route creates the thread and redirects to `/c/[threadId]`.
 */
export function ChatHistorySidebar({
  threads,
  chatBase,
  orgSlug,
  projectSlug,
  appMode,
}: ChatHistorySidebarProps) {
  const { t } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingNewChat, setPendingNewChat] = useState<ThreadSummary | null>(
    null,
  );
  const [isDeleting, startDelete] = useTransition();
  const [, startCreate] = useTransition();
  const [optimisticThreads, dispatchOptimisticThreads] = useOptimistic(
    threads,
    (state, action: OptimisticThreadAction) => {
      switch (action.type) {
        case "add":
          return [action.thread, ...state];
        case "delete":
          return state.filter((t) => t.id !== action.id);
      }
    },
  );

  const activeThreadId =
    typeof params.threadId === "string" ? params.threadId : undefined;

  const sidebarThreads = useMemo(() => {
    if (!pendingNewChat) return optimisticThreads;
    if (optimisticThreads.some((thread) => thread.id === pendingNewChat.id)) {
      return optimisticThreads;
    }
    return [pendingNewChat, ...optimisticThreads];
  }, [optimisticThreads, pendingNewChat]);

  useEffect(() => {
    setConfirmingId(null);
  }, [threads]);

  useEffect(() => {
    if (!pendingNewChat) return;
    if (activeThreadId && !isPendingThreadId(activeThreadId)) {
      setPendingNewChat(null);
    }
  }, [activeThreadId, pendingNewChat]);

  useEffect(() => {
    if (!confirmingId) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") cancelDelete();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [confirmingId]);

  function newChat() {
    setError(null);
    setConfirmingId(null);

    const pendingId = `${PENDING_THREAD_PREFIX}${crypto.randomUUID()}`;
    const optimisticThread: ThreadSummary = {
      id: pendingId,
      title: t("chat.sidebar.defaultThreadTitle"),
      updatedAt: new Date().toISOString(),
    };

    setPendingNewChat(optimisticThread);

    startCreate(() => {
      dispatchOptimisticThreads({ type: "add", thread: optimisticThread });
      router.push(`${chatBase}/new`);
    });
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
      dispatchOptimisticThreads({ type: "delete", id: threadId });

      try {
        await deleteChatThreadAction({
          orgSlug,
          projectSlug,
          threadId,
          appMode,
          chatBase,
        });

        if (onDeletedThread) {
          const next = remaining[0];
          router.push(next ? `${chatBase}/${next.id}` : `${chatBase}/new`);
        }
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
          {t("chat.sidebar.newChat")}
        </Button>
        {error ? (
          <p className="mt-2 text-xs text-destructive">{error}</p>
        ) : null}
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <nav className="flex flex-col gap-0.5 px-2 pb-3">
          {sidebarThreads.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">
              아직 대화가 없습니다
            </p>
          ) : (
            sidebarThreads.map((thread) => {
              const isPending = isPendingThreadId(thread.id);
              const isActive =
                thread.id === activeThreadId ||
                (isPending &&
                  (thread.id === pendingNewChat?.id ||
                    pathname === `${chatBase}/new`));
              const isConfirming = confirmingId === thread.id;
              return (
                <div
                  key={thread.id}
                  className={cn(
                    "group flex items-stretch gap-0.5 rounded-lg pr-1 transition-colors",
                    isConfirming
                      ? "bg-destructive/10 text-destructive"
                      : isActive
                        ? "bg-secondary text-secondary-foreground"
                        : "hover:bg-secondary/60",
                  )}
                >
                  {isPending ? (
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5 px-3 py-2 text-sm">
                      <span className="flex items-center gap-2 truncate font-medium">
                        <ChatCircleIcon
                          className={cn(
                            "size-3.5 shrink-0 opacity-60",
                            isConfirming && "text-destructive opacity-80",
                          )}
                        />
                        <span className="truncate">{thread.title}</span>
                      </span>
                      <span
                        className={cn(
                          "pl-5 text-xs text-muted-foreground",
                          isConfirming && "text-destructive/70",
                        )}
                      >
                        {formatWhen(thread.updatedAt)}
                      </span>
                    </div>
                  ) : (
                    <Link
                      href={`${chatBase}/${thread.id}`}
                      className="flex min-w-0 flex-1 flex-col gap-0.5 px-3 py-2 text-sm"
                      onClick={cancelDelete}
                    >
                      <span className="flex items-center gap-2 truncate font-medium">
                        <ChatCircleIcon
                          className={cn(
                            "size-3.5 shrink-0 opacity-60",
                            isConfirming && "text-destructive opacity-80",
                          )}
                        />
                        <span className="truncate">{thread.title}</span>
                      </span>
                      <span
                        className={cn(
                          "pl-5 text-xs text-muted-foreground",
                          isConfirming && "text-destructive/70",
                        )}
                      >
                        {formatWhen(thread.updatedAt)}
                      </span>
                    </Link>
                  )}
                  {isPending ? null : isConfirming ? (
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
