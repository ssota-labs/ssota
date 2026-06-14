"use client";

import { useMemo, useState } from "react";
import { MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";
import { Button } from "@ssota/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@ssota/ui/components/ui/dialog";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@ssota/ui/components/ui/input-group";
import { cn } from "@ssota/ui/lib/utils";
import type { WorkflowNodeCatalogOption } from "@/lib/workflows/workflow-context-defaults";

type AddContextFilterGroupDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeCatalog: WorkflowNodeCatalogOption[];
  existingNodeTypes: string[];
  onAddGroup: (nodeType: string) => void;
};

export function AddContextFilterGroupDialog({
  open,
  onOpenChange,
  nodeCatalog,
  existingNodeTypes,
  onAddGroup,
}: AddContextFilterGroupDialogProps) {
  const [query, setQuery] = useState("");
  const [selectedNodeType, setSelectedNodeType] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return nodeCatalog;
    return nodeCatalog.filter(
      (entry) =>
        entry.label.toLowerCase().includes(normalized) ||
        entry.nodeType.toLowerCase().includes(normalized),
    );
  }, [nodeCatalog, query]);

  function handleAdd() {
    if (!selectedNodeType) return;
    onAddGroup(selectedNodeType);
    setQuery("");
    setSelectedNodeType(null);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <DialogTitle className="text-sm font-medium">Add filter group</DialogTitle>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onOpenChange(false)}
          >
            <XIcon className="size-4" />
          </Button>
        </div>

        <div className="border-b px-4 py-3">
          <InputGroup>
            <InputGroupAddon>
              <MagnifyingGlassIcon className="size-4" />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Search node types..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </InputGroup>
        </div>

        <ul className="max-h-72 overflow-y-auto divide-y">
          {filtered.map((entry) => {
            const alreadyAdded = existingNodeTypes.includes(entry.nodeType);
            const selected = selectedNodeType === entry.nodeType;
            return (
              <li key={entry.nodeType}>
                <button
                  type="button"
                  disabled={alreadyAdded}
                  className={cn(
                    "flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left transition-colors",
                    selected && "bg-muted/50",
                    alreadyAdded
                      ? "cursor-not-allowed opacity-50"
                      : "hover:bg-muted/30",
                  )}
                  onClick={() => setSelectedNodeType(entry.nodeType)}
                >
                  <span className="text-sm font-medium">{entry.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {entry.nodeType}
                    {alreadyAdded ? " · already added" : ""}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex justify-end gap-2 border-t px-4 py-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={!selectedNodeType} onClick={handleAdd}>
            Add filter group
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
