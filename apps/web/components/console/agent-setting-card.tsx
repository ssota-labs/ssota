"use client";

import type { ReactNode } from "react";
import { CaretRightIcon } from "@phosphor-icons/react";
import { cn } from "@ssota/ui/lib/utils";

type AgentSettingCardProps = {
  title: string;
  description: string;
  onOpen: () => void;
  testId?: string;
  children?: ReactNode;
};

export function AgentSettingCard({
  title,
  description,
  onOpen,
  testId,
  children,
}: AgentSettingCardProps) {
  return (
    <section
      className="overflow-hidden rounded-lg border border-border bg-card"
      data-testid={testId}
    >
      <button
        type="button"
        className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
        onClick={onOpen}
      >
        <div className="min-w-0 flex-1 space-y-0.5">
          <h3 className="text-sm font-medium">{title}</h3>
          <p className="text-muted-foreground text-xs">{description}</p>
        </div>
        <CaretRightIcon
          className="mt-0.5 size-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
      </button>
      {children ? (
        <div className="border-border border-t">{children}</div>
      ) : null}
    </section>
  );
}

/** Divided rows inside a setting card footer (document-list-sheet style). */
export function AgentSettingItems({ children }: { children: ReactNode }) {
  return (
    <div className="divide-y divide-border">{children}</div>
  );
}

export function AgentSettingItem({
  title,
  subtitle,
  trailing,
  icon,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-2.5",
        className,
      )}
    >
      {icon ? (
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md border bg-muted/40">
          {icon}
        </span>
      ) : null}
      <div className="min-w-0 flex-1 space-y-0.5">
        <span className="block text-sm">{title}</span>
        {subtitle ? (
          <p className="text-muted-foreground line-clamp-2 text-xs">{subtitle}</p>
        ) : null}
      </div>
      {trailing ? (
        <span className="text-muted-foreground shrink-0 text-xs">{trailing}</span>
      ) : null}
    </div>
  );
}

export function AgentSettingEmpty({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <p className="text-muted-foreground px-4 py-3 text-xs">{children}</p>
  );
}
