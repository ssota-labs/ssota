"use client";

import dynamic from "next/dynamic";
import { useMemo, type ReactNode } from "react";
import { markdownToBlockNoteContent } from "@ssota/contracts";
import { cn } from "@ssota/ui/lib/utils";

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
