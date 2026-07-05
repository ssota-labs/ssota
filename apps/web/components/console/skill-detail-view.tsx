"use client";

import type { Block } from "@blocknote/core";
import dynamic from "next/dynamic";
import { useCallback, useMemo, type ReactNode } from "react";
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
  { ssr: false },
);

export function SkillDetailCard({
  title,
  children,
  className,
  testId,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  testId?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-card shadow-sm",
        className,
      )}
      data-testid={testId}
    >
      <header className="border-b border-border bg-muted/20 px-4 py-2.5">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </h3>
      </header>
      <div className="px-3 py-2">{children}</div>
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

  return (
    <div key={viewKey} data-testid="skill-markdown-view">
      <DocumentViewEl content={content} compact />
    </div>
  );
}
