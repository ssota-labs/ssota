"use client";

import { CaretDownIcon, XIcon } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { Button } from "@ssota/ui/components/ui/button";
import { cn } from "@ssota/ui/lib/utils";

type ContextExpandableBlockProps = {
  icon: Icon;
  title: string;
  description: string;
  testId: string;
  expandedTestId?: string;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onRemove: () => void;
  removeLabel: string;
  children: React.ReactNode;
};

export function ContextExpandableBlock({
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
}: ContextExpandableBlockProps) {
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
      </div>

      {expanded ? (
        <div
          className="bg-muted/10 px-3 py-3"
          data-testid={expandedTestId ?? `${testId}-expanded`}
        >
          {children}
        </div>
      ) : null}
    </li>
  );
}
