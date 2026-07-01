"use client";

import type { ReactNode } from "react";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { cn } from "@ssota/ui/lib/utils";
import { Button } from "@ssota/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@ssota/ui/components/ui/dialog";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@ssota/ui/components/ui/input-group";

export type SidebarListItem = {
  id: string;
  label: string;
  subtitle?: string;
  icon?: ReactNode;
  enabled?: boolean;
  testId?: string;
};

export type SidebarListGroup = {
  id: string;
  label: string;
  icon?: ReactNode;
  items: SidebarListItem[];
};

type AgentSettingsSidebarDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  items?: SidebarListItem[];
  groups?: SidebarListGroup[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
  searchPlaceholder?: string;
  detail: ReactNode;
  footer?: ReactNode;
  testId?: string;
  className?: string;
};

export function AgentSettingsSidebarDialog({
  open,
  onOpenChange,
  title,
  items,
  groups,
  selectedId,
  onSelect,
  searchQuery,
  onSearchQueryChange,
  searchPlaceholder = "Search…",
  detail,
  footer,
  testId,
  className,
}: AgentSettingsSidebarDialogProps) {
  const showSearch = onSearchQueryChange !== undefined;
  const flatItems =
    groups?.flatMap((group) => group.items) ?? items ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex h-[min(85vh,40rem)] w-[min(50vw,40rem)] !max-w-[min(50vw,40rem)] flex-col gap-0 overflow-hidden p-0 sm:!max-w-[min(50vw,40rem)]",
          className,
        )}
        forceBackdrop
        data-testid={testId}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <div className="flex min-h-0 flex-1">
          <aside className="border-border flex w-48 shrink-0 flex-col border-r bg-muted/20">
            <div className="space-y-2 px-3 py-3">
              <h2 className="min-w-0 truncate text-sm font-semibold">{title}</h2>
              {showSearch ? (
                <InputGroup className="h-8">
                  <InputGroupAddon align="inline-start">
                    <MagnifyingGlassIcon className="size-3.5" aria-hidden />
                  </InputGroupAddon>
                  <InputGroupInput
                    id={`${testId ?? title}-search`}
                    value={searchQuery ?? ""}
                    onChange={(e) => onSearchQueryChange?.(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="text-xs"
                  />
                </InputGroup>
              ) : null}
            </div>
            <nav
              className="min-h-0 flex-1 overflow-y-auto p-1.5"
              aria-label={title}
            >
              {flatItems.length === 0 ? (
                <p className="text-muted-foreground px-2 py-3 text-xs">
                  No items match your search.
                </p>
              ) : groups ? (
                <div className="space-y-3">
                  {groups.map((group) => (
                    <div key={group.id}>
                      <div className="text-muted-foreground flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium tracking-wide uppercase">
                        {group.icon}
                        <span>{group.label}</span>
                      </div>
                      <ul className="space-y-0.5">
                        {group.items.map((item) => (
                          <SidebarNavItem
                            key={item.id}
                            item={item}
                            selected={item.id === selectedId}
                            onSelect={onSelect}
                          />
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <ul className="space-y-0.5">
                  {flatItems.map((item) => (
                    <SidebarNavItem
                      key={item.id}
                      item={item}
                      selected={item.id === selectedId}
                      onSelect={onSelect}
                    />
                  ))}
                </ul>
              )}
            </nav>
          </aside>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto p-4">{detail}</div>
            {footer ? (
              <div className="flex justify-end px-4 py-3">{footer}</div>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function SidebarDetailHeader({
  icon,
  title,
  status,
  sticky = false,
}: {
  icon?: ReactNode;
  title: string;
  status?: ReactNode;
  sticky?: boolean;
}) {
  return (
    <div
      className={cn(
        "mb-4 flex items-start gap-3",
        sticky &&
          "sticky top-0 z-10 -mx-4 border-b border-border/60 bg-background/95 px-4 pb-3 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80",
      )}
    >
      {icon ? (
        <span className="bg-muted/50 flex size-10 shrink-0 items-center justify-center rounded-lg border border-border/60">
          {icon}
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold">{title}</h3>
          {status}
        </div>
      </div>
    </div>
  );
}

export function SidebarDetailDoneButton({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <Button type="button" onClick={onClick}>
      Done
    </Button>
  );
}

function SidebarNavItem({
  item,
  selected,
  onSelect,
}: {
  item: SidebarListItem;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <li>
      <button
        type="button"
        data-testid={item.testId}
        onClick={() => onSelect(item.id)}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm transition-colors",
          selected ? "bg-muted font-medium" : "hover:bg-muted/60",
        )}
      >
        {item.icon ? (
          <span className="bg-background flex size-7 shrink-0 items-center justify-center rounded-md border border-border/60 shadow-sm">
            {item.icon}
          </span>
        ) : null}
        <span className="min-w-0 flex-1">
          <span className="block text-sm leading-snug">{item.label}</span>
          {item.subtitle ? (
            <span className="text-muted-foreground block text-xs leading-snug font-normal">
              {item.subtitle}
            </span>
          ) : null}
        </span>
        {item.enabled !== undefined ? (
          <span
            className={cn(
              "size-1.5 shrink-0 rounded-full",
              item.enabled ? "bg-emerald-500" : "bg-muted-foreground/30",
            )}
            aria-hidden
          />
        ) : null}
      </button>
    </li>
  );
}
