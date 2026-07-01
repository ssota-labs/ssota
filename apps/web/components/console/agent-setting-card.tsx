"use client";

import type { ReactNode } from "react";
import { CaretRightIcon } from "@phosphor-icons/react";
import { cn } from "@ssota/ui/lib/utils";

type AgentSettingCardProps = {
  title: string;
  description: string;
  /** Omit when the card body is self-contained (e.g. inline editor). */
  onOpen?: () => void;
  testId?: string;
  children?: ReactNode;
  /** Bottom action row (e.g. “Add schedule”). */
  footer?: ReactNode;
};

export function AgentSettingCard({
  title,
  description,
  onOpen,
  testId,
  children,
  footer,
}: AgentSettingCardProps) {
  const header = (
    <div className="min-w-0 flex-1 space-y-0.5">
      <h3 className="text-sm font-medium">{title}</h3>
      <p className="text-muted-foreground text-xs">{description}</p>
    </div>
  );

  return (
    <section
      className="overflow-hidden rounded-lg border border-border bg-card"
      data-testid={testId}
    >
      {onOpen ? (
        <button
          type="button"
          className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
          onClick={onOpen}
        >
          {header}
          <CaretRightIcon
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
        </button>
      ) : (
        <div className="px-4 py-3">{header}</div>
      )}
      {children ? <div className="px-3 pb-2">{children}</div> : null}
      {footer ? (
        <div className="border-border/60 border-t px-3 py-2">{footer}</div>
      ) : null}
    </section>
  );
}

/** Rows inside a setting card body. */
export function AgentSettingItems({
  children,
  divided = false,
}: {
  children: ReactNode;
  divided?: boolean;
}) {
  return (
    <div className={divided ? "divide-y divide-border" : "flex flex-col"}>
      {children}
    </div>
  );
}

export function AgentSettingItem({
  title,
  subtitle,
  trailing,
  icon,
  className,
  testId,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  icon?: ReactNode;
  className?: string;
  testId?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-md px-1 py-2",
        className,
      )}
      data-testid={testId}
    >
      {icon ? (
        <span className="bg-muted/50 flex size-7 shrink-0 items-center justify-center rounded-md">
          {icon}
        </span>
      ) : null}
      <div className="min-w-0 flex-1 space-y-0.5">
        <span className="block text-sm">{title}</span>
        {subtitle ? (
          <p className="text-muted-foreground line-clamp-2 text-xs">{subtitle}</p>
        ) : null}
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
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
