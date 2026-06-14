"use client";

import { FlowArrowIcon, FunnelIcon, PlusIcon } from "@phosphor-icons/react";
import { Input } from "@ssota/ui/components/ui/input";
import { ScrollArea } from "@ssota/ui/components/ui/scroll-area";
import { cn } from "@ssota/ui/lib/utils";

export type WorkflowCatalogItem = {
  slug: string;
  label: string;
  stepCount?: number;
};

type WorkflowCatalogPanelProps = {
  items: WorkflowCatalogItem[];
  selectedSlug?: string | null;
  onSelect: (slug: string) => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  newWorkflowTrigger: React.ReactNode;
  emptyMessage?: string;
};

export function WorkflowCatalogPanel({
  items,
  selectedSlug,
  onSelect,
  searchQuery,
  onSearchQueryChange,
  newWorkflowTrigger,
  emptyMessage = "No workflows found.",
}: WorkflowCatalogPanelProps) {
  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r bg-muted/30">
      <div className="border-b px-3 py-2.5">
        <p className="text-sm font-semibold text-foreground">Workflows</p>
        <p className="text-xs text-muted-foreground">Choose a workflow</p>
      </div>
      <div className="space-y-2 border-b px-3 py-2">
        <div className="flex items-center gap-2">{newWorkflowTrigger}</div>
        <div className="relative">
          <Input
            placeholder="Search workflows..."
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            className="h-7 bg-background pr-8 text-xs"
          />
          <FunnelIcon className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <ul className="p-1.5">
          {items.length === 0 ? (
            <li className="px-2 py-4 text-center text-xs text-muted-foreground">
              {emptyMessage}
            </li>
          ) : (
            items.map((item) => {
              const active = selectedSlug === item.slug;
              return (
                <li key={item.slug}>
                  <button
                    type="button"
                    onClick={() => onSelect(item.slug)}
                    aria-current={active ? "true" : undefined}
                    data-testid={`catalog-workflow-${item.slug}`}
                    className={cn(
                      "flex w-full min-w-0 items-center gap-1.5 rounded-md px-2 py-1 text-left text-xs transition-colors hover:bg-muted/80",
                      active && "bg-muted font-medium text-foreground",
                    )}
                  >
                    <FlowArrowIcon
                      className="size-3 shrink-0 text-muted-foreground"
                      weight="regular"
                    />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {item.stepCount != null ? (
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {item.stepCount}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </ScrollArea>
    </aside>
  );
}

export function NewWorkflowButton({
  children,
  className,
  ...props
}: React.ComponentProps<"button"> & { children: React.ReactNode }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-7 w-full items-center justify-center gap-1 rounded-md border border-input bg-background px-2 text-xs font-medium shadow-xs transition-colors hover:bg-muted/60",
        className,
      )}
      {...props}
    >
      <PlusIcon className="size-3" />
      {children}
    </button>
  );
}
