"use client";

import { useMemo, useState } from "react";
import { MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";
import type { ContextAssertionKind } from "@ssota/contracts";
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
import { CONTEXT_ASSERTION_CATALOG } from "@/lib/workflows/workflow-context-defaults";

type AddContextTraversalDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasFilterGroups: boolean;
  onConfirm: () => void;
};

export function AddContextTraversalDialog({
  open,
  onOpenChange,
  hasFilterGroups,
  onConfirm,
}: AddContextTraversalDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <DialogTitle className="text-sm font-medium">Add traversal</DialogTitle>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onOpenChange(false)}
          >
            <XIcon className="size-4" />
          </Button>
        </div>
        <div className="space-y-3 px-4 py-4 text-sm">
          <p className="text-muted-foreground">
            Traversals hop from a filter group ref through edges in the graph.
          </p>
          {!hasFilterGroups ? (
            <p className="rounded-md border border-dashed bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              Add at least one filter group first so start refs are available.
            </p>
          ) : null}
        </div>
        <div className="flex justify-end gap-2 border-t px-4 py-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={!hasFilterGroups} onClick={onConfirm}>
            Add traversal
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type AddContextAssertionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddAssertion: (kind: ContextAssertionKind) => void;
};

export function AddContextAssertionDialog({
  open,
  onOpenChange,
  onAddAssertion,
}: AddContextAssertionDialogProps) {
  const [query, setQuery] = useState("");
  const [selectedKind, setSelectedKind] = useState<ContextAssertionKind | null>(
    null,
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return CONTEXT_ASSERTION_CATALOG;
    return CONTEXT_ASSERTION_CATALOG.filter(
      (entry) =>
        entry.label.toLowerCase().includes(normalized) ||
        entry.kind.toLowerCase().includes(normalized),
    );
  }, [query]);

  function handleAdd() {
    if (!selectedKind) return;
    onAddAssertion(selectedKind);
    setQuery("");
    setSelectedKind(null);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <DialogTitle className="text-sm font-medium">Add assertion</DialogTitle>
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
              placeholder="Search assertion kinds..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </InputGroup>
        </div>

        <ul className="max-h-72 overflow-y-auto divide-y">
          {filtered.map((entry) => {
            const selected = selectedKind === entry.kind;
            return (
              <li key={entry.kind}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left transition-colors hover:bg-muted/30",
                    selected && "bg-muted/50",
                  )}
                  onClick={() => setSelectedKind(entry.kind)}
                >
                  <span className="text-sm font-medium">{entry.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {entry.description}
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
          <Button type="button" disabled={!selectedKind} onClick={handleAdd}>
            Add assertion
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
