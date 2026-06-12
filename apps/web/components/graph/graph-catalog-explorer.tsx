"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { GraphTableSheet } from "@/components/graph/graph-table-sheet";
import {
  TableCatalogPanel,
  type TableCatalogItem,
} from "@/components/graph/table-catalog-panel";

type GraphCatalogExplorerProps = {
  title: string;
  items: TableCatalogItem[];
  newTableTrigger: React.ReactNode;
  sheetTitle?: string;
  sheetDescription?: string;
  sheetContent: React.ReactNode | null;
  emptyHint?: string;
};

export function GraphCatalogExplorer({
  title,
  items,
  newTableTrigger,
  sheetTitle,
  sheetDescription,
  sheetContent,
  emptyHint = "Select a table from the catalog to view rows.",
}: GraphCatalogExplorerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");

  const selectedSlug = searchParams.get("table");

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
  const sheetOpen = Boolean(selectedSlug && selectedItem && sheetContent);

  function setSelectedSlug(slug: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (slug) {
      params.set("table", slug);
    } else {
      params.delete("table");
    }
    const next = params.toString();
    router.push(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }

  return (
    <div className="flex h-full min-h-0">
      <TableCatalogPanel
        title={title}
        items={filteredItems}
        selectedSlug={selectedSlug}
        onSelect={setSelectedSlug}
        searchQuery={query}
        onSearchQueryChange={setQuery}
        newTableTrigger={newTableTrigger}
      />
      <div className="flex min-w-0 flex-1 flex-col items-center justify-center bg-background p-8 text-center">
        <p className="max-w-sm text-sm text-muted-foreground">{emptyHint}</p>
      </div>
      <GraphTableSheet
        open={sheetOpen}
        onOpenChange={(open) => {
          if (!open) setSelectedSlug(null);
        }}
        title={sheetTitle ?? selectedItem?.label ?? title}
        description={sheetDescription}
      >
        {sheetContent}
      </GraphTableSheet>
    </div>
  );
}
