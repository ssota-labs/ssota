"use client";

import type { ContextFilterGroup } from "@ssota/contracts";
import { XIcon } from "@phosphor-icons/react";
import { Button } from "@ssota/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@ssota/ui/components/ui/dialog";
import { ContextFilterGroupForm } from "@/components/workflows/context-filter-group-form";
import type { WorkflowNodeCatalogOption } from "@/lib/workflows/workflow-context-defaults";

type ContextFilterGroupEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: ContextFilterGroup | null;
  nodeCatalog: WorkflowNodeCatalogOption[];
  onSave: (group: ContextFilterGroup) => void;
};

export function ContextFilterGroupEditDialog({
  open,
  onOpenChange,
  group,
  nodeCatalog,
  onSave,
}: ContextFilterGroupEditDialogProps) {
  if (!group) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <DialogTitle className="text-sm font-medium">Edit filter group</DialogTitle>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onOpenChange(false)}
          >
            <XIcon className="size-4" />
          </Button>
        </div>

        <ContextFilterGroupForm
          group={group}
          nodeCatalog={nodeCatalog}
          onChange={onSave}
        />

        <div className="flex justify-end gap-2 border-t px-4 py-3">
          <Button type="button" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
