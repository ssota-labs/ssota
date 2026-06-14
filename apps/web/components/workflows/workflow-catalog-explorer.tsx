"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useProjectContext } from "@/components/console/project-context";
import {
  WorkflowCatalogPanel,
  type WorkflowCatalogItem,
} from "@/components/workflows/workflow-catalog-panel";
import { projectPath } from "@/lib/console/paths";

type WorkflowCatalogExplorerProps = {
  items: WorkflowCatalogItem[];
  newWorkflowTrigger: React.ReactNode;
  mainHeader?: { title: string; description?: string } | null;
  mainContent: React.ReactNode | null;
  tabBar?: React.ReactNode;
  emptyHint?: string;
};

export function WorkflowCatalogExplorer({
  items,
  newWorkflowTrigger,
  mainHeader,
  mainContent,
  tabBar,
  emptyHint = "Select a workflow to open the visual builder.",
}: WorkflowCatalogExplorerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const ctx = useProjectContext();
  const [query, setQuery] = useState("");

  const selectedSlug = searchParams.get("workflow");
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) || item.slug.toLowerCase().includes(q),
    );
  }, [items, query]);

  const selectedItem = items.find((item) => item.slug === selectedSlug) ?? null;
  const showMain = Boolean(selectedSlug && selectedItem && mainContent);

  function pushParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    const next = params.toString();
    router.push(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }

  function setSelectedSlug(slug: string) {
    pushParams((params) => {
      params.set("workflow", slug);
    });
  }

  return (
    <div className="flex h-full min-h-0">
      <WorkflowCatalogPanel
        items={filteredItems}
        selectedSlug={selectedSlug}
        onSelect={setSelectedSlug}
        searchQuery={query}
        onSearchQueryChange={setQuery}
        newWorkflowTrigger={newWorkflowTrigger}
      />
      <div className="flex min-w-0 flex-1 flex-col bg-background">
        {showMain ? (
          <>
            <div className="flex shrink-0 flex-col gap-2 border-b px-4 py-2">
              <div className="flex min-w-0 items-start gap-2">
                <div className="min-w-0 flex-1">
                  <h1 className="text-sm font-semibold">
                    {mainHeader?.title ?? selectedItem?.label}
                  </h1>
                  {mainHeader?.description ? (
                    <p className="text-xs text-muted-foreground">
                      {mainHeader.description}
                    </p>
                  ) : null}
                </div>
              </div>
              {tabBar ? (
                <div className="flex flex-wrap items-center gap-1">{tabBar}</div>
              ) : null}
            </div>
            <div className="flex min-h-0 flex-1 flex-col">{mainContent}</div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            <p className="max-w-sm text-sm text-muted-foreground">{emptyHint}</p>
            {items.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Create a workflow with the button in the left panel.
              </p>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                Or open{" "}
                <button
                  type="button"
                  className="text-primary underline-offset-4 hover:underline"
                  onClick={() => {
                    const first = items[0];
                    if (first) {
                      router.push(
                        `${projectPath(ctx, "workflow")}?workflow=${encodeURIComponent(first.slug)}`,
                        { scroll: false },
                      );
                    }
                  }}
                >
                  {items[0]?.label}
                </button>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
