"use client";

import { code } from "@streamdown/code";
import { Streamdown } from "streamdown";

import { cn } from "@/lib/utils";

type MarkdownContentProps = {
  content: string;
  className?: string;
};

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <Streamdown
      mode="static"
      className={cn("prose prose-sm max-w-none dark:prose-invert", className)}
      plugins={{ code }}
      shikiTheme={["github-light", "github-light"]}
      lineNumbers={false}
      controls={{ code: true, table: true }}
    >
      {content}
    </Streamdown>
  );
}
