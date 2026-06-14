"use client";

import { PlusIcon } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { Button } from "@ssota/ui/components/ui/button";
import { XIcon } from "@phosphor-icons/react";

export function ContextListSection({
  title,
  description,
  addLabel,
  addTestId,
  onAdd,
  hasItems,
  emptyMessage = "None added yet.",
  children,
}: {
  title: string;
  description: string;
  addLabel: string;
  addTestId: string;
  onAdd: () => void;
  hasItems: boolean;
  emptyMessage?: string;
  children: React.ReactNode;
}) {

  return (
    <section className="space-y-3">
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
      </div>
    </section>
  );
}

export function ContextListRow({
  icon: Icon,
  title,
  description,
  testId,
  onEdit,
  onRemove,
  removeLabel,
}: {
  icon: Icon;
  title: string;
  description: string;
  testId: string;
  onEdit: () => void;
  onRemove: () => void;
  removeLabel: string;
}) {
  return (
    <li className="flex items-center gap-3 px-3 py-3" data-testid={testId}>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-muted/30">
        <Icon className="size-4 text-muted-foreground" />
      </span>
      <button
        type="button"
        className="min-w-0 flex-1 text-left"
        onClick={onEdit}
      >
        <span className="block text-sm font-medium">{title}</span>
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
    </li>
  );
}
