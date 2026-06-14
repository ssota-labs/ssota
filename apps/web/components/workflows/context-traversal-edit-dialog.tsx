"use client";

import type { ContextTraversalPlan } from "@ssota/contracts";
import { XIcon } from "@phosphor-icons/react";
import { Button } from "@ssota/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@ssota/ui/components/ui/dialog";
import { Input } from "@ssota/ui/components/ui/input";
import { Label } from "@ssota/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ssota/ui/components/ui/select";
import type {
  WorkflowEdgeCatalogOption,
  WorkflowNodeCatalogOption,
} from "@/lib/workflows/workflow-context-defaults";

type ContextTraversalEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  traversal: ContextTraversalPlan | null;
  filterGroupRefs: Array<{ id: string; label: string }>;
  nodeCatalog: WorkflowNodeCatalogOption[];
  edgeCatalog: WorkflowEdgeCatalogOption[];
  title?: string;
  onSave: (traversal: ContextTraversalPlan) => void;
};

export function ContextTraversalEditDialog({
  open,
  onOpenChange,
  traversal,
  filterGroupRefs,
  nodeCatalog,
  edgeCatalog,
  title = "Edit traversal",
  onSave,
}: ContextTraversalEditDialogProps) {
  if (!traversal) return null;

  function patch(patch: Partial<ContextTraversalPlan>) {
    onSave({ ...traversal, ...patch } as ContextTraversalPlan);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <DialogTitle className="text-sm font-medium">{title}</DialogTitle>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onOpenChange(false)}
          >
            <XIcon className="size-4" />
          </Button>
        </div>

        <div className="grid gap-3 px-4 py-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs text-muted-foreground">Label</Label>
            <Input
              className="h-8"
              value={traversal.label ?? ""}
              placeholder={traversal.id}
              onChange={(event) =>
                patch({ label: event.target.value.trim() || undefined })
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Start ref</Label>
            <Select
              value={traversal.startNodeRef}
              onValueChange={(value) => value && patch({ startNodeRef: value })}
            >
              <SelectTrigger className="h-8 w-full">
                <SelectValue placeholder="Filter group or ref" />
              </SelectTrigger>
              <SelectContent>
                {filterGroupRefs.map((ref) => (
                  <SelectItem key={ref.id} value={ref.id}>
                    {ref.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Direction</Label>
            <Select
              value={traversal.direction}
              onValueChange={(value) =>
                value && patch({ direction: value as ContextTraversalPlan["direction"] })
              }
            >
              <SelectTrigger className="h-8 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="outgoing">Outgoing</SelectItem>
                <SelectItem value="incoming">Incoming</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Max hops</Label>
            <Input
              className="h-8"
              type="number"
              min={1}
              max={5}
              value={traversal.maxHops}
              onChange={(event) =>
                patch({ maxHops: Number(event.target.value) || 1 })
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Limit</Label>
            <Input
              className="h-8"
              type="number"
              min={1}
              max={100}
              value={traversal.limit ?? ""}
              placeholder="Optional"
              onChange={(event) =>
                patch({
                  limit: event.target.value ? Number(event.target.value) : undefined,
                })
              }
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs text-muted-foreground">Edge types</Label>
            <Select
              value={traversal.edgeTypes?.[0] ?? "__any__"}
              onValueChange={(value) =>
                patch({
                  edgeTypes: value && value !== "__any__" ? [value] : undefined,
                })
              }
            >
              <SelectTrigger className="h-8 w-full">
                <SelectValue placeholder="Any edge type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__any__">Any edge type</SelectItem>
                {edgeCatalog.map((entry) => (
                  <SelectItem key={entry.edgeType} value={entry.edgeType}>
                    {entry.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs text-muted-foreground">Node types</Label>
            <Select
              value={traversal.nodeTypes?.[0] ?? "__any__"}
              onValueChange={(value) =>
                patch({
                  nodeTypes: value && value !== "__any__" ? [value] : undefined,
                })
              }
            >
              <SelectTrigger className="h-8 w-full">
                <SelectValue placeholder="Any node type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__any__">Any node type</SelectItem>
                {nodeCatalog.map((entry) => (
                  <SelectItem key={entry.nodeType} value={entry.nodeType}>
                    {entry.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t px-4 py-3">
          <Button type="button" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
