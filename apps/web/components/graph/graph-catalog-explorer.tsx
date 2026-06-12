"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@ssota/ui/components/ui/button";
import { GraphTableSheet } from "@/components/graph/graph-table-sheet";
import {
  TableCatalogPanel,
  type TableCatalogItem,
} from "@/components/graph/table-catalog-panel";

type GraphCatalogExplorerProps = {
  title: string;
  items: TableCatalogItem[];
  newTableTrigger: React.ReactNode;
  mainHeader?: { title: string; description?: string } | null;
  mainContent: React.ReactNode | null;
  catalogSheetTitle?: string;
  catalogSheetDescription?: string;
  catalogSheetContent: React.ReactNode | null;
  emptyHint?: string;
};

export function GraphCatalogExplorer({
  title,
  items,
  newTableTrigger,
  mainHeader,
  mainContent,
  catalogSheetTitle,
  catalogSheetDescription,
  catalogSheetContent,
  emptyHint = "Select a table from the catalog to view rows.",
}: GraphCatalogExplorerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");

  const selectedSlug = searchParams.get("table");
  const definitionOpen = searchParams.get("definition") === "1";

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.slug.toLowerCase().includes(q) ||
        item.meta?.toLowerCase().includes(q),
    );
  }, [items, query]);

  const selectedItem = items.find((item) => item.slug === selectedSlug) ?? null;
  const showMain = Boolean(selectedSlug && selectedItem && mainContent);
  const showCatalogSheet = Boolean(
    selectedSlug && selectedItem && definitionOpen && catalogSheetContent,
  );

  function pushParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    const next = params.toString();
    router.push(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }

  function setSelectedSlug(slug: string) {
    pushParams((params) => {
      params.set("table", slug);
      params.delete("definition");
    });
  }

  function openDefinition(slug: string) {
    pushParams((params) => {
      params.set("table", slug);
      params.set("definition", "1");
    });
  }

  function closeDefinition() {
    pushParams((params) => {
      params.delete("definition");
    });
  }

  return (
    <div className="flex h-full min-h-0">
      <TableCatalogPanel
        title={title}
        items={filteredItems}
        selectedSlug={selectedSlug}
        onSelect={setSelectedSlug}
        onOpenSettings={openDefinition}
        searchQuery={query}
        onSearchQueryChange={setQuery}
        newTableTrigger={newTableTrigger}
      />
      <div className="flex min-w-0 flex-1 flex-col bg-background">
        {showMain ? (
          <>
            <div className="flex shrink-0 items-start gap-2 border-b px-4 py-2">
              <div className="min-w-0 flex-1">
                <h1 className="text-sm font-semibold">{mainHeader?.title ?? selectedItem?.label}</h1>
                {mainHeader?.description ? (
                  <p className="text-xs text-muted-foreground">{mainHeader.description}</p>
                ) : null}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                data-testid="open-definition"
                onClick={() => openDefinition(selectedSlug!)}
              >
                Definition
              </Button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col">{mainContent}</div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            <p className="max-w-sm text-sm text-muted-foreground">{emptyHint}</p>
          </div>
        )}
      </div>
      <GraphTableSheet
        open={showCatalogSheet}
        onOpenChange={(open) => {
          if (!open) closeDefinition();
        }}
        title={catalogSheetTitle ?? `Definition · ${selectedItem?.label ?? title}`}
        description={catalogSheetDescription}
      >
        {catalogSheetContent}
      </GraphTableSheet>
    </div>
  );
}
