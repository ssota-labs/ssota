"use client";

import { MarkdownContent } from "@ssota/ui/components/page-patterns/markdown-content";
import { cn } from "@ssota/ui/lib/utils";

type RoadmapMarkdownPreviewProps = {
  content: string;
  className?: string;
};

export function RoadmapMarkdownPreview({
  content,
  className,
}: RoadmapMarkdownPreviewProps) {
  return (
    <div className={cn("relative max-h-64 overflow-hidden", className)}>
      <MarkdownContent content={content} />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card to-transparent"
      />
    </div>
  );
}
