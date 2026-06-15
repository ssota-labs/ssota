"use client";

import { DotsThreeIcon, FunnelIcon, PlusIcon, TableIcon } from "@phosphor-icons/react";
import { Button } from "@ssota/ui/components/ui/button";
import { Input } from "@ssota/ui/components/ui/input";
import { ScrollArea } from "@ssota/ui/components/ui/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@ssota/ui/components/ui/toggle-group";
import { cn } from "@ssota/ui/lib/utils";

export type GraphCatalogKind = "node" | "edge" | "action";

export type TableCatalogItem = {
  slug: string;
  label: string;
};

type TableCatalogPanelProps = {
  kind: GraphCatalogKind;
  onKindChange: (kind: GraphCatalogKind) => void;
  showKindSwitch?: boolean;
  items: TableCatalogItem[];
  selectedSlug?: string | null;
  onSelect: (slug: string) => void;
  onOpenSettings?: (slug: string) => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  newTableTrigger: React.ReactNode;
  emptyMessage?: string;
};

const KIND_LABELS: Record<GraphCatalogKind, string> = {
  node: "Node",
  edge: "Edge",
  action: "Action",
};

export function TableCatalogPanel({
  kind,
  onKindChange,
  showKindSwitch = true,
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
    <aside className="flex h-full w-56 shrink-0 flex-col border-r bg-muted/30">
      <div className="border-b px-3 py-2.5">
        <p className="text-sm font-semibold text-foreground">Graph</p>
        <p className="text-xs text-muted-foreground">Choose a graph object</p>
      </div>
      <div className="space-y-2 border-b px-3 py-2">
        {showKindSwitch ? (
          <ToggleGroup
            value={[kind]}
            onValueChange={(values) => {
              const next = values[0] as GraphCatalogKind | undefined;
              if (next) onKindChange(next);
            }}
            variant="outline"
            size="sm"
            spacing={0}
            className="grid w-full grid-cols-3"
          >
            {(Object.keys(KIND_LABELS) as GraphCatalogKind[]).map((value) => (
              <ToggleGroupItem
                key={value}
                value={value}
                className="h-7 flex-1 px-0 text-xs"
                data-testid={`graph-kind-${value}`}
              >
                {KIND_LABELS[value]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        ) : null}
        <div className="flex items-center gap-2">{newTableTrigger}</div>
        <div className="relative">
          <Input
            placeholder="Search graph..."
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
            <li className="px-2 py-4 text-center text-xs text-muted-foreground">{emptyMessage}</li>
          ) : (
            items.map((item) => {
              const active = selectedSlug === item.slug;
              return (
                <li key={item.slug}>
                  <div
                    className={cn(
                      "group flex items-center gap-0.5 rounded-md pr-0.5",
                      active && "bg-muted",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onSelect(item.slug)}
                      aria-current={active ? "true" : undefined}
                      data-testid={`catalog-table-${item.slug}`}
                      className={cn(
                        "flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-2 py-1 text-left text-xs transition-colors hover:bg-muted/80",
                        active && "font-medium text-foreground",
                      )}
                    >
                      <TableIcon
                        className="size-3 shrink-0 text-muted-foreground"
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
                        className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-background hover:text-foreground group-hover:opacity-100"
                      >
                        <DotsThreeIcon className="size-3.5" weight="bold" />
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </ScrollArea>
    </aside>
  );
}

export function NewTableButton({
  children,
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      variant="outline"
      size="sm"
      className={cn("h-7 w-full gap-1 px-2 text-xs", className)}
      {...props}
    >
      <PlusIcon className="size-3" />
      {children}
    </Button>
  );
}
