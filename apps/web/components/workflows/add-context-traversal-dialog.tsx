"use client";

import { useMemo, useState } from "react";
import { FlowArrowIcon } from "@phosphor-icons/react";
import type { ContextFilterGroup } from "@ssota/contracts";
import { Button } from "@ssota/ui/components/ui/button";
import { Dialog, DialogContent } from "@ssota/ui/components/ui/dialog";
import { cn } from "@ssota/ui/lib/utils";
import {
  WORKFLOW_CATALOG_DIALOG_CONTENT_CLASS,
  WORKFLOW_CATALOG_DIALOG_GRID_CLASS,
  WorkflowCatalogDialogFooter,
  WorkflowCatalogDialogHeader,
} from "@/components/workflows/workflow-catalog-dialog-shell";
import {
  filterGroupSummary,
  type WorkflowNodeCatalogOption,
} from "@/lib/workflows/workflow-context-defaults";

type AddContextTraversalDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filterGroups: ContextFilterGroup[];
  nodeCatalog: WorkflowNodeCatalogOption[];
  onAddTraversal: (filterGroup: ContextFilterGroup) => void;
};

function TraversalCatalogPanel({
  group,
  summary,
}: {
  group: ContextFilterGroup;
  summary: { title: string; description: string };
}) {
  return (
    <div className="flex min-h-[240px] flex-col px-5 py-4">
      <div className="flex items-start gap-2.5">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md border bg-muted/40">
          <FlowArrowIcon className="size-3.5 text-muted-foreground" />
        </div>
        <div className="space-y-0.5">
          <p className="text-xs font-medium">{summary.title}</p>
          <p className="text-[11px] text-muted-foreground">{group.id}</p>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {summary.description}
          </p>
        </div>
      </div>

      <div className="mt-auto space-y-3">
        <div className="rounded-md border bg-muted/20 px-4 py-3">
          <p className="text-[11px] text-muted-foreground">
            Starts from this filter group ref with both directions and 2 hops by
            default. Refine edge types, limits, and hops after add.
          </p>
        </div>
      </div>
    </div>
  );
}

export function AddContextTraversalDialog({
  open,
  onOpenChange,
  filterGroups,
  nodeCatalog,
  onAddTraversal,
}: AddContextTraversalDialogProps) {
  const [query, setQuery] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState(filterGroups[0]?.id ?? "");

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setSelectedGroupId((current) =>
        filterGroups.some((group) => group.id === current)
          ? current
          : (filterGroups[0]?.id ?? ""),
      );
    } else {
      setQuery("");
      setSelectedGroupId(filterGroups[0]?.id ?? "");
    }
    onOpenChange(nextOpen);
  }

  const filteredGroups = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return filterGroups;

    return filterGroups.filter((group) => {
      const summary = filterGroupSummary(group, nodeCatalog);
      return (
        summary.title.toLowerCase().includes(normalized) ||
        summary.description.toLowerCase().includes(normalized) ||
        group.nodeType.toLowerCase().includes(normalized) ||
        group.id.toLowerCase().includes(normalized)
      );
    });
  }, [filterGroups, nodeCatalog, query]);

  const selectedGroup =
    filterGroups.find((group) => group.id === selectedGroupId) ??
    filteredGroups[0] ??
    null;

  const selectedSummary = selectedGroup
    ? filterGroupSummary(selectedGroup, nodeCatalog)
    : null;

  function handleAdd() {
    if (!selectedGroup) return;
    onAddTraversal(selectedGroup);
    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={WORKFLOW_CATALOG_DIALOG_CONTENT_CLASS}
      >
        <WorkflowCatalogDialogHeader
          title="Add traversal"
          query={query}
          onQueryChange={setQuery}
          onClose={() => handleOpenChange(false)}
        />

        <div className={WORKFLOW_CATALOG_DIALOG_GRID_CLASS}>
          <nav className="overflow-y-auto border-r bg-muted/10 p-1.5">
            {filteredGroups.length === 0 ? (
              <p className="px-2 py-4 text-[11px] text-muted-foreground">
                No filter groups match your search.
              </p>
            ) : (
              <div className="mb-2 last:mb-0">
                <p className="px-2 py-0.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                  Filter groups
                </p>
                <ul className="space-y-0.5">
                  {filteredGroups.map((group) => {
                    const summary = filterGroupSummary(group, nodeCatalog);
                    const active = selectedGroup?.id === group.id;

                    return (
                      <li key={group.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedGroupId(group.id)}
                          className={cn(
                            "flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                            active
                              ? "bg-accent text-accent-foreground"
                              : "text-foreground hover:bg-muted/60",
                          )}
                        >
                          <FlowArrowIcon className="size-3 shrink-0 text-muted-foreground" />
                          <span className="truncate">{summary.title}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </nav>

          <div className="min-h-0 overflow-y-auto bg-background">
            {selectedGroup && selectedSummary ? (
              <TraversalCatalogPanel
                group={selectedGroup}
                summary={selectedSummary}
              />
            ) : (
              <div className="flex h-full items-center justify-center px-5 text-xs text-muted-foreground">
                filter group를 선택하세요.
              </div>
            )}
          </div>
        </div>

        <WorkflowCatalogDialogFooter>
          <Button
            type="button"
            size="sm"
            disabled={!selectedGroup}
            data-testid="confirm-add-context-traversal"
            onClick={handleAdd}
          >
            Add traversal
          </Button>
        </WorkflowCatalogDialogFooter>
      </DialogContent>
    </Dialog>
  );
}
