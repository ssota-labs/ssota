"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@ssota/ui/components/ui/button";
import { useGraphCatalog } from "@/components/console/graph-catalog-context";
import { useProjectContext } from "@/components/console/project-context";
import { GraphTableSheet } from "@/components/graph/graph-table-sheet";
import {
  TableCatalogPanel,
  type GraphCatalogKind,
} from "@/components/graph/table-catalog-panel";
import { graphPath } from "@/lib/console/paths";

type GraphCatalogExplorerProps = {
  kind?: GraphCatalogKind;
  newTableTrigger: React.ReactNode;
  mainHeader?: { title: string; description?: string } | null;
  mainContent: React.ReactNode | null;
  catalogSheetTitle?: string;
  catalogSheetDescription?: string;
  catalogSheetContent?: React.ReactNode | null;
  emptyHint?: string;
  showDefinition?: boolean;
  requireSelection?: boolean;
  showKindSwitch?: boolean;
};

function kindFromPathname(pathname: string): GraphCatalogKind {
  if (pathname.includes("/graph/edges")) return "edge";
  if (pathname.includes("/graph/actions")) return "action";
  return "node";
}

function actionSlugFromPathname(pathname: string): string | null {
  const match = pathname.match(/\/graph\/actions\/([^/]+)/);
  return match ? decodeURIComponent(match[1]!) : null;
}

export function GraphCatalogExplorer({
  kind: kindProp,
  newTableTrigger,
  mainHeader,
  mainContent,
  catalogSheetTitle,
  catalogSheetDescription,
  catalogSheetContent,
  emptyHint,
  showDefinition = true,
  requireSelection = true,
  showKindSwitch = true,
}: GraphCatalogExplorerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const ctx = useProjectContext();
  const catalog = useGraphCatalog();
  const [query, setQuery] = useState("");

  const kind = kindProp ?? kindFromPathname(pathname);
  const items =
    kind === "node"
      ? (catalog?.nodeTypes ?? [])
      : kind === "edge"
        ? (catalog?.edgeTypes ?? [])
        : (catalog?.actionTypes ?? []);

  const selectedSlug =
    kind === "action" ? actionSlugFromPathname(pathname) : searchParams.get("table");
  const definitionOpen = searchParams.get("definition") === "1";

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) || item.slug.toLowerCase().includes(q),
    );
  }, [items, query]);

  const selectedItem = items.find((item) => item.slug === selectedSlug) ?? null;
  const showMain = requireSelection
    ? Boolean(selectedSlug && selectedItem && mainContent)
    : Boolean(mainContent);
  const showCatalogSheet = Boolean(
    showDefinition &&
      kind !== "action" &&
      selectedSlug &&
      selectedItem &&
      definitionOpen &&
      catalogSheetContent,
  );

  const defaultEmptyHint =
    kind === "node"
      ? "Select a node table to view instance rows."
      : kind === "edge"
        ? "Select an edge table to view instance rows."
        : "Select an action to view runs.";

  function pushParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    const next = params.toString();
    router.push(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }

  function setSelectedSlug(slug: string) {
    if (kind === "action") {
      router.push(graphPath(ctx, "actions", slug), { scroll: false });
      return;
    }
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

  function handleKindChange(nextKind: GraphCatalogKind) {
    if (nextKind === kind) return;

    if (nextKind === "action") {
      const fallback = catalog?.actionTypes[0]?.slug;
      router.push(
        fallback ? graphPath(ctx, "actions", fallback) : graphPath(ctx, "actions"),
        { scroll: false },
      );
      return;
    }

    const route = nextKind === "edge" ? "edges" : "nodes";
    const candidates =
      nextKind === "edge" ? (catalog?.edgeTypes ?? []) : (catalog?.nodeTypes ?? []);
    const preserved = candidates.some((item) => item.slug === selectedSlug)
      ? selectedSlug
      : candidates[0]?.slug;
    const base = graphPath(ctx, route);
    router.push(preserved ? `${base}?table=${encodeURIComponent(preserved)}` : base, {
      scroll: false,
    });
  }

  return (
    <div className="flex h-full min-h-0">
      <TableCatalogPanel
        kind={kind}
        onKindChange={handleKindChange}
        showKindSwitch={showKindSwitch}
        items={filteredItems}
        selectedSlug={selectedSlug}
        onSelect={setSelectedSlug}
        onOpenSettings={showDefinition && kind !== "action" ? openDefinition : undefined}
        searchQuery={query}
        onSearchQueryChange={setQuery}
        newTableTrigger={newTableTrigger}
        emptyMessage={
          kind === "action" ? "No actions found." : `No ${kind} tables found.`
        }
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
              {showDefinition && kind !== "action" ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  data-testid="open-definition"
                  onClick={() => openDefinition(selectedSlug!)}
                >
                  Definition
                </Button>
              ) : null}
            </div>
            <div className="flex min-h-0 flex-1 flex-col">{mainContent}</div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            <p className="max-w-sm text-sm text-muted-foreground">
              {emptyHint ?? defaultEmptyHint}
            </p>
          </div>
        )}
      </div>
      <GraphTableSheet
        open={showCatalogSheet}
        onOpenChange={(open) => {
          if (!open) closeDefinition();
        }}
        title={catalogSheetTitle ?? `Definition · ${selectedItem?.label ?? kind}`}
        description={catalogSheetDescription}
      >
        {catalogSheetContent}
      </GraphTableSheet>
    </div>
  );
}
