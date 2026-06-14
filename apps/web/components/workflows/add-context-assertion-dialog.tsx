"use client";

import { useMemo, useState } from "react";
import { CheckCircleIcon } from "@phosphor-icons/react";
import type { ContextAssertionKind } from "@ssota/contracts";
import { Button } from "@ssota/ui/components/ui/button";
import { Dialog } from "@ssota/ui/components/ui/dialog";
import { cn } from "@ssota/ui/lib/utils";
import {
  WORKFLOW_CATALOG_DIALOG_GRID_CLASS,
  WorkflowCatalogDialogContent,
  WorkflowCatalogDialogFooter,
  WorkflowCatalogDialogHeader,
} from "@/components/workflows/workflow-catalog-dialog-shell";
import {
  CONTEXT_ASSERTION_CATALOG,
  CONTEXT_ASSERTION_CATALOG_GROUPS,
  DEFAULT_CONTEXT_ASSERTION_SELECTION,
  type ContextAssertionCatalogEntry,
} from "@/lib/workflows/workflow-context-defaults";

type AddContextAssertionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddAssertion: (kind: ContextAssertionKind) => void;
};

function findAssertionCatalogEntry(groupId: string, kind: ContextAssertionKind) {
  const group = CONTEXT_ASSERTION_CATALOG_GROUPS.find((entry) => entry.id === groupId);
  const item = group?.items.find((entry) => entry.kind === kind);
  return { group, item };
}

function AssertionCatalogPanel({ entry }: { entry: ContextAssertionCatalogEntry }) {
  return (
    <div className="flex min-h-[240px] flex-col px-5 py-4">
      <div className="flex items-start gap-2.5">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md border bg-muted/40">
          <CheckCircleIcon className="size-3.5 text-muted-foreground" />
        </div>
        <div className="space-y-0.5">
          <p className="text-xs font-medium">{entry.label}</p>
          <p className="text-[11px] text-muted-foreground">{entry.kind}</p>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {entry.description}
          </p>
        </div>
      </div>

      <div className="mt-auto rounded-md border bg-muted/20 px-4 py-3">
        <p className="text-[11px] text-muted-foreground">
          Defaults to agentic soft enforcement. Refine params after add in the
          edit dialog.
        </p>
      </div>
    </div>
  );
}

export function AddContextAssertionDialog({
  open,
  onOpenChange,
  onAddAssertion,
}: AddContextAssertionDialogProps) {
  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState(DEFAULT_CONTEXT_ASSERTION_SELECTION);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setQuery("");
      setSelection(DEFAULT_CONTEXT_ASSERTION_SELECTION);
    }
    onOpenChange(nextOpen);
  }

  const filteredCatalog = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return CONTEXT_ASSERTION_CATALOG_GROUPS;

    return CONTEXT_ASSERTION_CATALOG_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          item.label.toLowerCase().includes(normalized) ||
          item.kind.toLowerCase().includes(normalized) ||
          group.label.toLowerCase().includes(normalized),
      ),
    })).filter((group) => group.items.length > 0);
  }, [query]);

  const selected = findAssertionCatalogEntry(selection.groupId, selection.kind);
  const selectedEntry =
    selected.item ??
    CONTEXT_ASSERTION_CATALOG.find((entry) => entry.kind === selection.kind) ??
    null;

  function handleAdd() {
    if (!selectedEntry) return;
    onAddAssertion(selectedEntry.kind);
    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <WorkflowCatalogDialogContent>
        <WorkflowCatalogDialogHeader
          title="Add assertion"
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
                    const active =
                      selection.groupId === group.id && selection.kind === item.kind;

                    return (
                      <li key={item.kind}>
                        <button
                          type="button"
                          onClick={() =>
                            setSelection({ groupId: group.id, kind: item.kind })
                          }
                          className={cn(
                            "flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                            active
                              ? "bg-accent text-accent-foreground"
                              : "text-foreground hover:bg-muted/60",
                          )}
                        >
                          <CheckCircleIcon className="size-3 shrink-0 text-muted-foreground" />
                          <span className="truncate">{item.label}</span>
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
              <AssertionCatalogPanel entry={selectedEntry} />
            ) : (
              <div className="flex h-full items-center justify-center px-5 text-xs text-muted-foreground">
                assertion 유형을 선택하세요.
              </div>
            )}
          </div>
        </div>

        <WorkflowCatalogDialogFooter>
          <Button
            type="button"
            size="sm"
            disabled={!selectedEntry}
            data-testid="confirm-add-context-assertion"
            onClick={handleAdd}
          >
            Add assertion
          </Button>
        </WorkflowCatalogDialogFooter>
      </WorkflowCatalogDialogContent>
    </Dialog>
  );
}
