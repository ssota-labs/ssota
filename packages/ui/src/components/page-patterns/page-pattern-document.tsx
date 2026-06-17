import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { MarkdownContent } from "./markdown-content";
import { PageFrame } from "./page-frame";

type PagePatternDocumentProps = {
  title: string;
  status?: string;
  statusVariant?: "default" | "secondary" | "outline" | "destructive";
  meta?: ReactNode;
  content?: string;
  body?: ReactNode;
  onEdit?: () => void;
  editLabel?: string;
  filters?: ReactNode;
  actions?: ReactNode;
  emptyState?: ReactNode;
  className?: string;
};

export function PagePatternDocument({
  title,
  status,
  statusVariant = "secondary",
  meta,
  content,
  body,
  onEdit,
  editLabel = "Edit",
  filters,
  actions,
  emptyState,
  className,
}: PagePatternDocumentProps) {
  const hasBody = body != null || (content != null && content.length > 0);

  const toolbarActions =
    actions != null || onEdit != null ? (
      <>
        {actions}
        {onEdit ? (
          <Button type="button" size="sm" onClick={onEdit}>
            {editLabel}
          </Button>
        ) : null}
      </>
    ) : undefined;

  return (
    <PageFrame
      filters={filters}
      actions={toolbarActions}
      className={className}
      bodyClassName="space-y-6"
    >
      {hasBody ? (
        <header className="space-y-3 border-b pb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
              {meta}
            </div>
            {status ? <Badge variant={statusVariant}>{status}</Badge> : null}
          </div>
        </header>
      ) : null}

      {!hasBody && emptyState ? (
        emptyState
      ) : body ? (
        body
      ) : content ? (
        <div className={cn("rounded-lg border bg-card p-4 md:p-6")}>
          <MarkdownContent content={content} />
        </div>
      ) : null}
    </PageFrame>
  );
}
