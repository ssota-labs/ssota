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
import {
  DEFAULT_WORKFLOW_TRIGGER_SELECTION,
  WORKFLOW_TRIGGER_CATALOG,
  type WorkflowTriggerCatalogItem,
} from "@/lib/workflows/workflow-trigger-catalog";

type AddWorkflowTriggerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingKinds: string[];
  onAddTrigger: (kind: string) => void;
};

function triggerKindAlreadyAdded(
  existingKinds: string[],
  kind: string,
): boolean {
  return existingKinds.includes(kind);
}

function findCatalogItem(categoryId: string, itemId: string) {
  const category = WORKFLOW_TRIGGER_CATALOG.find(
    (entry) => entry.id === categoryId,
  );
  const item = category?.items.find((entry) => entry.id === itemId);
  return { category, item };
}

function TriggerCatalogPanel({
  item,
  alreadyAdded,
}: {
  item: WorkflowTriggerCatalogItem;
  alreadyAdded: boolean;
}) {
  const ItemIcon = item.icon;

  return (
    <div className="flex min-h-[240px] flex-col px-5 py-4">
      <div className="flex items-start gap-2.5">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md border bg-muted/40">
          <ItemIcon className="size-3.5 text-muted-foreground" />
        </div>
        <div className="space-y-0.5">
          <p className="text-xs font-medium">{item.label}</p>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {item.description}
          </p>
        </div>
      </div>

      {alreadyAdded ? (
        <div className="mt-auto rounded-md border bg-muted/20 px-4 py-8 text-center">
          <p className="text-xs font-medium">Already added</p>
          <p className="mt-1 max-w-sm text-[11px] leading-relaxed text-muted-foreground">
            This trigger is already in the workflow list. Toggle it on or off from
            the sheet.
          </p>
        </div>
      ) : item.available ? (
        <div className="mt-auto rounded-md border border-dashed bg-muted/20 px-4 py-8 text-center">
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Additional configuration for this trigger will be available soon.
          </p>
        </div>
      ) : (
        <div className="mt-auto flex flex-col items-center justify-center gap-1.5 rounded-md border border-dashed bg-muted/20 px-4 py-8 text-center">
          <p className="text-xs font-medium">준비 중</p>
          <p className="max-w-sm text-[11px] leading-relaxed text-muted-foreground">
            런타임 연결 전이지만 카탈로그에 추가해 저장할 수 있습니다.
          </p>
        </div>
      )}
    </div>
  );
}

export function AddWorkflowTriggerDialog({
  open,
  onOpenChange,
  existingKinds,
  onAddTrigger,
}: AddWorkflowTriggerDialogProps) {
  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState(DEFAULT_WORKFLOW_TRIGGER_SELECTION);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setQuery("");
      setSelection(DEFAULT_WORKFLOW_TRIGGER_SELECTION);
    }
    onOpenChange(nextOpen);
  }

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
  const alreadyAdded = selectedItem
    ? triggerKindAlreadyAdded(existingKinds, selectedItem.id)
    : false;

  function handleAddTrigger() {
    if (!selectedItem || alreadyAdded) return;
    onAddTrigger(selectedItem.id);
    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[min(640px,calc(100vh-3rem))] w-[min(760px,calc(100vw-2rem))] max-w-[760px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[760px]"
      >
        <div className="flex items-center gap-2 border-b px-3 py-2.5">
          <DialogTitle className="text-sm font-medium">Add trigger</DialogTitle>
          <InputGroup className="ml-auto h-7 max-w-[11rem]">
            <InputGroupAddon>
              <MagnifyingGlassIcon className="size-3 shrink-0 opacity-50" />
            </InputGroupAddon>
            <InputGroupInput
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder="Search"
            />
          </InputGroup>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-7 shrink-0"
            onClick={() => handleOpenChange(false)}
          >
            <XIcon className="size-3.5" />
            <span className="sr-only">Close</span>
          </Button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-[200px_minmax(0,1fr)]">
          <nav className="overflow-y-auto border-r bg-muted/10 p-1.5">
            {filteredCatalog.map((category) => (
              <div key={category.id} className="mb-2 last:mb-0">
                <p className="px-2 py-0.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                  {category.label}
                </p>
                <ul className="space-y-0.5">
                  {category.items.map((item) => {
                    const ItemIcon = item.icon;
                    const active =
                      selection.categoryId === category.id &&
                      selection.itemId === item.id;
                    const isAdded = existingKinds.includes(item.id);

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
                            "flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                            active
                              ? "bg-accent text-accent-foreground"
                              : "text-foreground hover:bg-muted/60",
                          )}
                        >
                          <ItemIcon className="size-3 shrink-0 text-muted-foreground" />
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
            {selectedItem ? (
              <TriggerCatalogPanel
                item={selectedItem}
                alreadyAdded={alreadyAdded}
              />
            ) : (
              <div className="flex h-full items-center justify-center px-5 text-xs text-muted-foreground">
                트리거 유형을 선택하세요.
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end border-t px-3 py-2.5">
          <Button
            type="button"
            size="sm"
            disabled={!selectedItem || alreadyAdded}
            onClick={handleAddTrigger}
          >
            Add trigger
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
