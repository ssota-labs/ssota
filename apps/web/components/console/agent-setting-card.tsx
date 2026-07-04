"use client";

import type { ReactNode } from "react";
import { CaretRightIcon } from "@phosphor-icons/react";
import { cn } from "@ssota/ui/lib/utils";

type AgentSettingCardRootProps = {
  testId?: string;
  className?: string;
  children: ReactNode;
};

function AgentSettingCardRoot({
  testId,
  className,
  children,
}: AgentSettingCardRootProps) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-transparent",
        className,
      )}
      data-testid={testId}
    >
      {children}
    </section>
  );
}

type AgentSettingCardHeaderProps = {
  title: string;
  description: string;
  /** Trailing control (e.g. open chevron) — same row as Triggers header. */
  action?: ReactNode;
};

function AgentSettingCardHeader({
  title,
  description,
  action,
}: AgentSettingCardHeaderProps) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <div className="min-w-0 flex-1 space-y-0.5">
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="text-muted-foreground text-xs">{description}</p>
      </div>
      {action}
    </div>
  );
}

function AgentSettingCardBody({ children }: { children: ReactNode }) {
  return <div className="select-none px-3 pb-2">{children}</div>;
}

function AgentSettingCardFooter({ children }: { children: ReactNode }) {
  return (
    <div className="border-border/60 border-t px-3 py-2">{children}</div>
  );
}

function AgentSettingCardItemCaret({ className }: { className?: string }) {
  return (
    <CaretRightIcon
      className={cn("text-muted-foreground size-4 shrink-0", className)}
      aria-hidden
    />
  );
}

function AgentSettingCardOpenAction({
  onOpen,
  testId = "agent-setting-card-open",
  "aria-label": ariaLabel = "Open settings",
}: {
  onOpen: () => void;
  testId?: string;
  "aria-label"?: string;
}) {
  return (
    <button
      type="button"
      className="text-muted-foreground hover:text-foreground mt-0.5 shrink-0 rounded-md p-0.5 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={onOpen}
      data-testid={testId}
      aria-label={ariaLabel}
    >
      <CaretRightIcon className="size-4" aria-hidden />
    </button>
  );
}

/** Rows inside a setting card body. */
function AgentSettingItems({
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

function AgentSettingItem({
  title,
  subtitle,
  trailing,
  icon,
  className,
  testId,
  onPress,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  icon?: ReactNode;
  className?: string;
  testId?: string;
  /** Makes the full row open/edit; trailing controls stop propagation. */
  onPress?: (element: HTMLDivElement) => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-md px-1 py-2",
        onPress &&
          "cursor-pointer transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      data-testid={testId}
      role={onPress ? "button" : undefined}
      tabIndex={onPress ? 0 : undefined}
      onClick={onPress ? (e) => onPress(e.currentTarget) : undefined}
      onKeyDown={
        onPress
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onPress(e.currentTarget);
              }
            }
          : undefined
      }
    >
      {icon ? (
        <span className="bg-muted/50 flex size-7 shrink-0 items-center justify-center rounded-md">
          {icon}
        </span>
      ) : null}
      <div className="min-w-0 flex-1 space-y-0.5">
        <span className="block min-w-0 text-sm [overflow-wrap:anywhere]">{title}</span>
        {subtitle ? (
          <p className="text-muted-foreground line-clamp-2 text-xs">{subtitle}</p>
        ) : null}
      </div>
      {trailing ? (
        <div
          className="shrink-0"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {trailing}
        </div>
      ) : null}
    </div>
  );
}

function AgentSettingEmpty({ children }: { children: ReactNode }) {
  return (
    <p className="text-muted-foreground px-1 py-2 text-xs">{children}</p>
  );
}

export const AgentSettingCard = {
  Root: AgentSettingCardRoot,
  Header: AgentSettingCardHeader,
  Body: AgentSettingCardBody,
  Footer: AgentSettingCardFooter,
  OpenAction: AgentSettingCardOpenAction,
  ItemCaret: AgentSettingCardItemCaret,
  Items: AgentSettingItems,
  Item: AgentSettingItem,
  Empty: AgentSettingEmpty,
};
