"use client";

import { useMemo, useState } from "react";
import { TableIcon } from "@phosphor-icons/react";
import type { EdgeCatalogEntry, NodeCatalogEntry } from "@ssota/contracts";
import { Button } from "@ssota/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@ssota/ui/components/ui/dialog";
import { cn } from "@ssota/ui/lib/utils";
import { NodeSchemaView } from "@/components/graph/node-schema-view";
import {
  WORKFLOW_CATALOG_DIALOG_CONTENT_CLASS,
  WORKFLOW_CATALOG_DIALOG_GRID_CLASS,
  WorkflowCatalogDialogFooter,
  WorkflowCatalogDialogHeader,
} from "@/components/workflows/workflow-catalog-dialog-shell";
import {
  buildNodeTypeCatalog,
  buildSchemaRelations,
} from "@/lib/graph/node-schema-view-props";

type AddWorkflowNodeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingNodeTypes: string[];
  nodeCatalog: NodeCatalogEntry[];
  edgeCatalog: EdgeCatalogEntry[];
  onAddNode: (nodeType: string) => void;
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
    items: [...items].sort((a: NodeCatalogEntry, b: NodeCatalogEntry) =>
      a.label.localeCompare(b.label),
    ),
  }));
}

function NodeCatalogPanel({
  entry,
  relations,
  nodeTypeCatalog,
  alreadyAdded,
}: {
  entry: NodeCatalogEntry;
  relations: ReturnType<typeof buildSchemaRelations>;
  nodeTypeCatalog: ReturnType<typeof buildNodeTypeCatalog>;
  alreadyAdded: boolean;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-start gap-3 border-b px-5 py-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-muted/30">
          <TableIcon className="size-4 text-muted-foreground" />
        </span>
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium">{entry.label}</p>
          {entry.contentGuide ? (
            <p className="text-xs leading-relaxed text-muted-foreground">
              {entry.contentGuide}
            </p>
          ) : null}
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        <NodeSchemaView
          nodeType={entry.nodeType}
          label={entry.label}
          family={entry.family}
          archetypeId={entry.archetypeId ?? null}
          contentGuide={entry.contentGuide ?? null}
          propertySchema={entry.propertySchema}
          relations={relations}
          nodeTypeCatalog={nodeTypeCatalog}
          className="absolute inset-0 h-full p-0"
          canvasClassName="h-full min-h-0 rounded-none border-0 bg-transparent"
          fitViewPadding={0.2}
        />
      </div>

      {alreadyAdded ? (
        <p className="shrink-0 border-t px-5 py-2 text-xs text-muted-foreground">
          Already added — this node type is registered for this workflow.
        </p>
      ) : null}
    </div>
  );
}

export function AddWorkflowNodeDialog({
  open,
  onOpenChange,
  existingNodeTypes,
  nodeCatalog,
  edgeCatalog,
  onAddNode,
}: AddWorkflowNodeDialogProps) {
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

  const nodeTypeCatalog = useMemo(
    () => buildNodeTypeCatalog(nodeCatalog),
    [nodeCatalog],
  );

  const selectedEntry =
    nodeCatalog.find((entry) => entry.nodeType === selectedNodeType) ?? null;
  const selectedRelations = useMemo(
    () =>
      selectedEntry
        ? buildSchemaRelations(selectedEntry.nodeType, edgeCatalog)
        : [],
    [edgeCatalog, selectedEntry],
  );
  const alreadyAdded = selectedEntry
    ? existingNodeTypes.includes(selectedEntry.nodeType)
    : false;

  function handleAddNode() {
    if (!selectedEntry || alreadyAdded) return;
    onAddNode(selectedEntry.nodeType);
    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={WORKFLOW_CATALOG_DIALOG_CONTENT_CLASS}
      >
        <WorkflowCatalogDialogHeader
          title="Add node"
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
                          <TableIcon className="size-3 shrink-0 text-muted-foreground" />
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

          <div className="flex min-h-0 flex-col overflow-hidden bg-background">
            {selectedEntry ? (
              <NodeCatalogPanel
                entry={selectedEntry}
                relations={selectedRelations}
                nodeTypeCatalog={nodeTypeCatalog}
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
            data-testid="confirm-add-workflow-node"
            onClick={handleAddNode}
          >
            Add node
          </Button>
        </WorkflowCatalogDialogFooter>
      </DialogContent>
    </Dialog>
  );
}
