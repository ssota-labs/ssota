"use client";

import { useMemo, useState } from "react";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { Button } from "@ssota/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@ssota/ui/components/ui/dialog";
import { Input } from "@ssota/ui/components/ui/input";
import { cn } from "@ssota/ui/lib/utils";
import {
  DEFAULT_WORKFLOW_TRIGGER_SELECTION,
  WORKFLOW_TRIGGER_CATALOG,
  type WorkflowTriggerCatalogItem,
} from "@/lib/workflows/workflow-trigger-catalog";

type AddWorkflowTriggerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function findCatalogItem(categoryId: string, itemId: string) {
  const category = WORKFLOW_TRIGGER_CATALOG.find(
    (entry) => entry.id === categoryId,
  );
  const item = category?.items.find((entry) => entry.id === itemId);
  return { category, item };
}

function TriggerCatalogPanel({
  item,
}: {
  item: WorkflowTriggerCatalogItem;
}) {
  const ItemIcon = item.icon;

  return (
    <div className="flex min-h-[280px] flex-col px-6 py-5">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
          <ItemIcon className="size-4 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">{item.label}</p>
          <p className="text-xs text-muted-foreground">{item.description}</p>
        </div>
      </div>

      <div className="mt-auto flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/20 px-6 py-10 text-center">
        <p className="text-sm font-medium">준비 중</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          이 트리거 유형은 곧 설정할 수 있습니다. 지금은 수동 실행만 지원합니다.
        </p>
      </div>
    </div>
  );
}

export function AddWorkflowTriggerDialog({
  open,
  onOpenChange,
}: AddWorkflowTriggerDialogProps) {
  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState(DEFAULT_WORKFLOW_TRIGGER_SELECTION);

  const filteredCatalog = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return WORKFLOW_TRIGGER_CATALOG;

    return WORKFLOW_TRIGGER_CATALOG.map((category) => ({
      ...category,
      items: category.items.filter(
        (item) =>
          item.label.toLowerCase().includes(normalized) ||
          category.label.toLowerCase().includes(normalized),
      ),
    })).filter((category) => category.items.length > 0);
  }, [query]);

  const selected = findCatalogItem(selection.categoryId, selection.itemId);
  const selectedItem =
    selected.item ?? WORKFLOW_TRIGGER_CATALOG[0]?.items[0] ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex h-[min(640px,calc(100vh-3rem))] w-[min(760px,calc(100vw-2rem))] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-none"
      >
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <DialogTitle className="text-base font-medium">Add trigger</DialogTitle>
          <div className="relative ml-auto w-full max-w-xs">
            <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder="Search"
              className="h-8 pl-8"
            />
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-[220px_minmax(0,1fr)]">
          <nav className="overflow-y-auto border-r bg-muted/10 p-2">
            {filteredCatalog.map((category) => (
              <div key={category.id} className="mb-3 last:mb-0">
                <p className="px-2 py-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  {category.label}
                </p>
                <ul className="space-y-0.5">
                  {category.items.map((item) => {
                    const ItemIcon = item.icon;
                    const active =
                      selection.categoryId === category.id &&
                      selection.itemId === item.id;

                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() =>
                            setSelection({
                              categoryId: category.id,
                              itemId: item.id,
                            })
                          }
                          className={cn(
                            "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors",
                            active
                              ? "bg-accent text-accent-foreground"
                              : "text-foreground hover:bg-muted/60",
                          )}
                        >
                          <ItemIcon className="size-4 shrink-0 text-muted-foreground" />
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
            {selectedItem ? (
              <TriggerCatalogPanel item={selectedItem} />
            ) : (
              <div className="flex h-full items-center justify-center px-6 text-sm text-muted-foreground">
                트리거 유형을 선택하세요.
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end border-t px-4 py-3">
          <Button type="button" disabled>
            Add trigger
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
