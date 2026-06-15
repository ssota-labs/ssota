"use client";

import { CaretDownIcon, PlusIcon, XIcon } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ExpandableListSectionProps = {
  title: string;
  description: string;
  addLabel: string;
  addTestId?: string;
  onAdd?: () => void;
  hasItems: boolean;
  emptyMessage?: string;
  className?: string;
  children?: React.ReactNode;
};

function ExpandableListSection({
  title,
  description,
  addLabel,
  addTestId,
  onAdd,
  hasItems,
  emptyMessage = "None added yet.",
  className,
  children,
}: ExpandableListSectionProps) {
  return (
    <section className={cn("space-y-3", className)}>
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        {hasItems ? (
          <ul className="divide-y">{children}</ul>
        ) : (
          <p className="px-3 py-4 text-xs text-muted-foreground">{emptyMessage}</p>
        )}

        {onAdd ? (
          <div className="border-t px-3 py-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-muted-foreground"
              data-testid={addTestId}
              onClick={onAdd}
            >
              <PlusIcon className="size-3.5" />
              {addLabel}
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

type ExpandableListItemProps = {
  icon: Icon;
  title: string;
  description: string;
  testId?: string;
  expandedTestId?: string;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onRemove?: () => void;
  removeLabel: string;
  children: React.ReactNode;
};

function ExpandableListItem({
  icon: IconComponent,
  title,
  description,
  testId,
  expandedTestId,
  expanded,
  onExpandedChange,
  onRemove,
  removeLabel,
  children,
}: ExpandableListItemProps) {
  return (
    <li className="divide-y" data-testid={testId}>
      <div className="flex items-center gap-3 px-3 py-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-muted/30">
          <IconComponent className="size-4 text-muted-foreground" />
        </span>
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          aria-expanded={expanded}
          onClick={() => onExpandedChange(!expanded)}
        >
          <span className="flex items-center gap-1.5">
            <span className="block text-sm font-medium">{title}</span>
            <CaretDownIcon
              className={cn(
                "size-3.5 shrink-0 text-muted-foreground transition-transform",
                expanded && "rotate-180",
              )}
            />
          </span>
          <span className="block text-xs text-muted-foreground">{description}</span>
        </button>
        {onRemove ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0 text-muted-foreground"
            onClick={onRemove}
            aria-label={removeLabel}
          >
            <XIcon className="size-3.5" />
          </Button>
        ) : null}
      </div>

      {expanded ? (
        <div
          className="px-3 py-3"
          data-testid={expandedTestId ?? (testId ? `${testId}-expanded` : undefined)}
        >
          {children}
        </div>
      ) : null}
    </li>
  );
}

export { ExpandableListSection, ExpandableListItem };
