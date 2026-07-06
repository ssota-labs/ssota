"use client";

import type { Block } from "@blocknote/core";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  blockNoteContentToMarkdown,
  markdownToBlockNoteContent,
} from "@ssota/contracts";
import { Skeleton } from "@ssota/ui/components/ui/skeleton";
import { cn } from "@ssota/ui/lib/utils";
import { toBlocks } from "@/lib/page-runtime/catalog-document";

const SsotaBlockNoteEditor = dynamic(
  () =>
    import("@/components/editor/blocknote-editor").then(
      (m) => m.SsotaBlockNoteEditor,
    ),
  { ssr: false },
);

const DocumentViewEl = dynamic(
  () =>
    import("@/lib/page-runtime/catalog-document").then((m) => m.DocumentViewEl),
  { ssr: false, loading: () => <SkillMarkdownSkeleton /> },
);

export function SkillMarkdownSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("min-h-[10rem] space-y-2.5 py-1", className)}
      data-testid="skill-markdown-skeleton"
      aria-busy="true"
      aria-label="Loading preview"
    >
      <Skeleton className="h-4 w-[88%] rounded-sm" />
      <Skeleton className="h-3.5 w-full rounded-sm" />
      <Skeleton className="h-3.5 w-[96%] rounded-sm" />
      <Skeleton className="h-3.5 w-full rounded-sm" />
      <Skeleton className="h-3.5 w-[72%] rounded-sm" />
      <Skeleton className="h-5 w-[42%] rounded-sm" />
      <Skeleton className="h-3.5 w-full rounded-sm" />
      <Skeleton className="h-3.5 w-[90%] rounded-sm" />
    </div>
  );
}

export function SkillDetailCard({
  title,
  children,
  className,
  testId,
  scrollable = false,
  scrollLines,
  bodyClassName,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  testId?: string;
  /** Cap body height and scroll long markdown (matches SkillMdBodyEditor). */
  scrollable?: boolean;
  /** Fixed body height in ~text-sm lines; scrolls when content overflows. */
  scrollLines?: number;
  bodyClassName?: string;
}) {
  const scrollBodyClass =
    scrollLines != null
      ? scrollLines === 3
        ? "h-[4.75rem] min-h-[4.75rem] overflow-y-auto"
        : `h-[calc(${scrollLines}*1.25rem+1rem)] min-h-0 overflow-y-auto`
      : scrollable
        ? "max-h-[min(24rem,45vh)] min-h-0 overflow-y-auto"
        : undefined;

  return (
    <section
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm",
        className,
      )}
      data-testid={testId}
    >
      <header className="shrink-0 border-b border-border bg-muted/20 px-4 py-2.5">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </h3>
      </header>
      <div
        className={cn("px-3 py-2", scrollBodyClass, bodyClassName)}
      >
        {children}
      </div>
    </section>
  );
}

export function SkillDetailCardSkeleton({
  title,
  className,
  testId,
  lines = 4,
}: {
  title: string;
  className?: string;
  testId?: string;
  lines?: number;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-card shadow-sm",
        className,
      )}
      data-testid={testId}
      aria-busy="true"
      aria-label={`Loading ${title}`}
    >
      <header className="border-b border-border bg-muted/20 px-4 py-2.5">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </h3>
      </header>
      <div className="space-y-2 px-3 py-3">
        {Array.from({ length: lines }, (_, index) => (
          <Skeleton
            key={index}
            className={cn(
              "h-3.5 rounded-sm",
              index === 0 ? "w-[92%]" : index === lines - 1 ? "w-[55%]" : "w-full",
            )}
          />
        ))}
      </div>
    </section>
  );
}

export function SkillMdBodyEditor({
  markdown,
  onMarkdownChange,
  testId,
  editorKey,
}: {
  markdown: string;
  onMarkdownChange: (markdown: string) => void;
  testId?: string;
  editorKey?: string;
}) {
  const initialContent = useMemo(
    () => toBlocks(markdownToBlockNoteContent(markdown)),
    [editorKey],
  );

  const handleChange = useCallback(
    (blocks: Block[]) => {
      onMarkdownChange(blockNoteContentToMarkdown(blocks));
    },
    [onMarkdownChange],
  );

  return (
    <div
      className="min-h-48 max-h-[min(24rem,45vh)] overflow-y-auto rounded-md border border-input px-3"
      data-testid={testId}
    >
      <SsotaBlockNoteEditor
        key={editorKey ?? "skill-md-body"}
        editable
        compact
        initialContent={initialContent}
        onChange={handleChange}
      />
    </div>
  );
}

export function SkillMarkdownView({
  markdown,
  viewKey,
}: {
  markdown: string;
  viewKey: string;
}) {
  const content = useMemo(() => markdownToBlockNoteContent(markdown), [markdown]);
  const [editorReady, setEditorReady] = useState(false);

  useEffect(() => {
    setEditorReady(false);
  }, [viewKey]);

  const handleEditorReady = useCallback(() => {
    setEditorReady(true);
  }, []);

  return (
    <div
      key={viewKey}
      className="relative min-h-[10rem]"
      data-testid="skill-markdown-view"
    >
      {!editorReady ? (
        <SkillMarkdownSkeleton className="absolute inset-0 z-10 bg-card" />
      ) : null}
      <div className={cn(!editorReady && "invisible")} aria-hidden={!editorReady}>
        <DocumentViewEl
          content={content}
          compact
          onEditorReady={handleEditorReady}
        />
      </div>
    </div>
  );
}
