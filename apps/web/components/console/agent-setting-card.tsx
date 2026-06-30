"use client";

import type { ReactNode } from "react";
import { CaretRightIcon } from "@phosphor-icons/react";
import { cn } from "@ssota/ui/lib/utils";

type AgentSettingCardProps = {
  title: string;
  description: string;
  summary?: ReactNode;
  onOpen: () => void;
  testId?: string;
  children?: ReactNode;
};

export function AgentSettingCard({
  title,
  description,
  summary,
  onOpen,
  testId,
  children,
}: AgentSettingCardProps) {
  return (
    <section
      className="rounded-lg border border-border bg-card"
      data-testid={testId}
    >
      <button
        type="button"
        className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
        onClick={onOpen}
      >
        <div className="min-w-0 flex-1 space-y-1">
          <h3 className="text-sm font-medium">{title}</h3>
          <p className="text-muted-foreground text-xs">{description}</p>
          {summary ? (
            <div className="text-muted-foreground pt-1 text-xs">{summary}</div>
          ) : null}
        </div>
        <CaretRightIcon
          className="mt-0.5 size-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
      </button>
      {children ? (
        <div className="border-border border-t px-4 py-3">{children}</div>
      ) : null}
    </section>
  );
}

export function AgentSettingSummaryRow({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-2 py-1", className)}>
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right text-sm">{value}</span>
    </div>
  );
}
