"use client";

import { DotsThreeIcon, FunnelIcon, PlusIcon, TableIcon } from "@phosphor-icons/react";
import { Button } from "@ssota/ui/components/ui/button";
import { Input } from "@ssota/ui/components/ui/input";
import { ScrollArea } from "@ssota/ui/components/ui/scroll-area";
import { cn } from "@ssota/ui/lib/utils";

export type TableCatalogItem = {
  slug: string;
  label: string;
  meta?: string;
};

type TableCatalogPanelProps = {
  title: string;
  schemaLabel?: string;
  items: TableCatalogItem[];
  selectedSlug?: string | null;
  onSelect: (slug: string) => void;
  onOpenSettings?: (slug: string) => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  newTableTrigger: React.ReactNode;
  emptyMessage?: string;
};

export function TableCatalogPanel({
  title,
  schemaLabel = "project",
  items,
  selectedSlug,
  onSelect,
  onOpenSettings,
  searchQuery,
  onSearchQueryChange,
  newTableTrigger,
  emptyMessage = "No tables found.",
}: TableCatalogPanelProps) {
  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r bg-muted/30">
      <div className="space-y-3 border-b px-3 py-3">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 items-center rounded-md border bg-background px-2 text-xs text-muted-foreground">
            {schemaLabel}
          </span>
          <div className="ml-auto">{newTableTrigger}</div>
        </div>
        <div className="relative">
          <Input
            placeholder="Search tables..."
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            className="h-8 bg-background pr-8 text-xs"
          />
          <FunnelIcon className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <ul className="space-y-0.5 p-2">
          {items.length === 0 ? (
            <li className="px-2 py-6 text-center text-xs text-muted-foreground">{emptyMessage}</li>
          ) : (
            items.map((item) => {
              const active = selectedSlug === item.slug;
              return (
                <li key={item.slug}>
                  <div
                    className={cn(
                      "group flex items-center gap-0.5 rounded-md pr-1",
                      active && "bg-muted",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onSelect(item.slug)}
                      aria-current={active ? "true" : undefined}
                      data-testid={`catalog-table-${item.slug}`}
                      className={cn(
                        "flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted/80",
                        active && "font-medium text-foreground",
                      )}
                    >
                      <TableIcon
                        className="size-3.5 shrink-0 text-muted-foreground"
                        weight="regular"
                      />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    </button>
                    {onOpenSettings ? (
                      <button
                        type="button"
                        aria-label={`Catalog settings for ${item.label}`}
                        data-testid={`catalog-settings-${item.slug}`}
                        onClick={() => onOpenSettings(item.slug)}
                        className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-background hover:text-foreground group-hover:opacity-100"
                      >
                        <DotsThreeIcon className="size-3.5" weight="bold" />
                      </button>
                    ) : null}
                  </div>
                  {item.meta ? (
                    <p className="truncate px-2 pb-1 pl-7 text-[10px] text-muted-foreground">
                      {item.meta}
                    </p>
                  ) : null}
                </li>
              );
            })
          )}
        </ul>
      </ScrollArea>
    </aside>
  );
}

export function NewTableButton({ children }: { children: React.ReactNode }) {
  return (
    <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs">
      <PlusIcon className="size-3" />
      {children}
    </Button>
  );
}
