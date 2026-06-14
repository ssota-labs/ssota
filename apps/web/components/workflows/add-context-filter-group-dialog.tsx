"use client";

import { useMemo, useState } from "react";
import { FunnelIcon } from "@phosphor-icons/react";
import type { NodeCatalogEntry } from "@ssota/contracts";
import { Button } from "@ssota/ui/components/ui/button";
import { Dialog, DialogContent } from "@ssota/ui/components/ui/dialog";
import { cn } from "@ssota/ui/lib/utils";
import {
  WORKFLOW_CATALOG_DIALOG_CONTENT_CLASS,
  WORKFLOW_CATALOG_DIALOG_GRID_CLASS,
  WorkflowCatalogDialogFooter,
  WorkflowCatalogDialogHeader,
} from "@/components/workflows/workflow-catalog-dialog-shell";

type AddContextFilterGroupDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeCatalog: NodeCatalogEntry[];
  existingNodeTypes: string[];
  onAddGroup: (nodeType: string) => void;
};

const FAMILY_LABELS: Record<string, string> = {
  document: "Document",
  operational: "Operational",
  structural: "Structural",
};

function groupNodeCatalog(entries: NodeCatalogEntry[]) {
  const groups = new Map<string, NodeCatalogEntry[]>();
  for (const entry of entries) {
    const family = entry.family;
    const list = groups.get(family) ?? [];
    list.push(entry);
    groups.set(family, list);
  }
  return [...groups.entries()].map(([family, items]) => ({
    id: family,
    label: FAMILY_LABELS[family] ?? family,
    items: [...items].sort((a, b) => a.label.localeCompare(b.label)),
  }));
}

function FilterGroupCatalogPanel({
  entry,
  alreadyAdded,
}: {
  entry: NodeCatalogEntry;
  alreadyAdded: boolean;
}) {
  const propertyKeys = Object.keys(entry.propertySchema ?? {});

  return (
    <div className="flex min-h-[240px] flex-col px-5 py-4">
      <div className="flex items-start gap-2.5">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md border bg-muted/40">
          <FunnelIcon className="size-3.5 text-muted-foreground" />
        </div>
        <div className="space-y-0.5">
          <p className="text-xs font-medium">{entry.label}</p>
          <p className="text-[11px] text-muted-foreground">{entry.nodeType}</p>
          {entry.contentGuide ? (
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {entry.contentGuide}
            </p>
          ) : null}
        </div>
      </div>

      {alreadyAdded ? (
        <div className="mt-auto rounded-md border bg-muted/20 px-4 py-8 text-center">
          <p className="text-xs font-medium">Already added</p>
          <p className="mt-1 max-w-sm text-[11px] leading-relaxed text-muted-foreground">
            This node type already has a filter group in this workflow context.
          </p>
        </div>
      ) : (
        <div className="mt-auto space-y-3">
          <div className="rounded-md border bg-muted/20 px-4 py-3">
            <p className="text-[11px] text-muted-foreground">
              {propertyKeys.length
                ? `${propertyKeys.length} filterable propert${propertyKeys.length === 1 ? "y" : "ies"} available after add.`
                : "No property filters yet — include all rows of this node type."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export function AddContextFilterGroupDialog({
  open,
  onOpenChange,
  nodeCatalog,
  existingNodeTypes,
  onAddGroup,
}: AddContextFilterGroupDialogProps) {
  const [query, setQuery] = useState("");
  const [selectedNodeType, setSelectedNodeType] = useState(
    nodeCatalog[0]?.nodeType ?? "",
  );

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setQuery("");
      setSelectedNodeType(nodeCatalog[0]?.nodeType ?? "");
    }
    onOpenChange(nextOpen);
  }

  const groupedCatalog = useMemo(() => groupNodeCatalog(nodeCatalog), [nodeCatalog]);

  const filteredCatalog = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return groupedCatalog;

    return groupedCatalog
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            item.label.toLowerCase().includes(normalized) ||
            item.nodeType.toLowerCase().includes(normalized) ||
            group.label.toLowerCase().includes(normalized),
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [groupedCatalog, query]);

  const selectedEntry =
    nodeCatalog.find((entry) => entry.nodeType === selectedNodeType) ?? null;
  const alreadyAdded = selectedEntry
    ? existingNodeTypes.includes(selectedEntry.nodeType)
    : false;

  function handleAdd() {
    if (!selectedEntry || alreadyAdded) return;
    onAddGroup(selectedEntry.nodeType);
    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={WORKFLOW_CATALOG_DIALOG_CONTENT_CLASS}
      >
        <WorkflowCatalogDialogHeader
          title="Add filter group"
          query={query}
          onQueryChange={setQuery}
          onClose={() => handleOpenChange(false)}
        />

        <div className={WORKFLOW_CATALOG_DIALOG_GRID_CLASS}>
          <nav className="overflow-y-auto border-r bg-muted/10 p-1.5">
            {filteredCatalog.map((group) => (
              <div key={group.id} className="mb-2 last:mb-0">
                <p className="px-2 py-0.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                  {group.label}
                </p>
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = selectedNodeType === item.nodeType;
                    const isAdded = existingNodeTypes.includes(item.nodeType);

                    return (
                      <li key={item.nodeType}>
                        <button
                          type="button"
                          onClick={() => setSelectedNodeType(item.nodeType)}
                          className={cn(
                            "flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                            active
                              ? "bg-accent text-accent-foreground"
                              : "text-foreground hover:bg-muted/60",
                          )}
                        >
                          <FunnelIcon className="size-3 shrink-0 text-muted-foreground" />
                          <span className="truncate">{item.label}</span>
                          {isAdded ? (
                            <span className="ml-auto text-[10px] text-muted-foreground">
                              Added
                            </span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          <div className="min-h-0 overflow-y-auto bg-background">
            {selectedEntry ? (
              <FilterGroupCatalogPanel
                entry={selectedEntry}
                alreadyAdded={alreadyAdded}
              />
            ) : (
              <div className="flex h-full items-center justify-center px-5 text-xs text-muted-foreground">
                노드 타입을 선택하세요.
              </div>
            )}
          </div>
        </div>

        <WorkflowCatalogDialogFooter>
          <Button
            type="button"
            size="sm"
            disabled={!selectedEntry || alreadyAdded}
            data-testid="confirm-add-filter-group"
            onClick={handleAdd}
          >
            Add filter group
          </Button>
        </WorkflowCatalogDialogFooter>
      </DialogContent>
    </Dialog>
  );
}
