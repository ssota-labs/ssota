"use client";

import type { ContextTraversalPlan } from "@ssota/contracts";
import { XIcon } from "@phosphor-icons/react";
import { Button } from "@ssota/ui/components/ui/button";
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

type ContextTraversalListProps = {
  traversals: ContextTraversalPlan[];
  filterGroupRefs: Array<{ id: string; label: string }>;
  nodeCatalog: WorkflowNodeCatalogOption[];
  edgeCatalog: WorkflowEdgeCatalogOption[];
  onChange: (traversals: ContextTraversalPlan[]) => void;
  onAddTraversal: () => void;
};

export function ContextTraversalList({
  traversals,
  filterGroupRefs,
  nodeCatalog,
  edgeCatalog,
  onChange,
  onAddTraversal,
}: ContextTraversalListProps) {
  function updateTraversal(id: string, patch: Partial<ContextTraversalPlan>) {
    onChange(
      traversals.map((traversal) =>
        traversal.id === id ? { ...traversal, ...patch } : traversal,
      ),
    );
  }

  function removeTraversal(id: string) {
    onChange(traversals.filter((traversal) => traversal.id !== id));
  }

  return (
    <div className="space-y-3">
      {traversals.map((traversal) => (
        <div
          key={traversal.id}
          className="rounded-lg border bg-card p-3"
          data-testid={`traversal-${traversal.id}`}
        >
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="grid flex-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs text-muted-foreground">Label</Label>
                <Input
                  className="h-8"
                  value={traversal.label ?? ""}
                  placeholder={traversal.id}
                  onChange={(event) =>
                    updateTraversal(traversal.id, {
                      label: event.target.value.trim() || undefined,
                    })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Start ref</Label>
                <Select
                  value={traversal.startNodeRef}
                  onValueChange={(value) =>
                    value && updateTraversal(traversal.id, { startNodeRef: value })
                  }
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
                    value &&
                    updateTraversal(traversal.id, {
                      direction: value as ContextTraversalPlan["direction"],
                    })
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
                    updateTraversal(traversal.id, {
                      maxHops: Number(event.target.value) || 1,
                    })
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
                    updateTraversal(traversal.id, {
                      limit: event.target.value
                        ? Number(event.target.value)
                        : undefined,
                    })
                  }
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs text-muted-foreground">Edge types</Label>
                <Select
                  value={traversal.edgeTypes?.[0] ?? "__any__"}
                  onValueChange={(value) =>
                    updateTraversal(traversal.id, {
                      edgeTypes:
                        value && value !== "__any__" ? [value] : undefined,
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
                    updateTraversal(traversal.id, {
                      nodeTypes:
                        value && value !== "__any__" ? [value] : undefined,
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

            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0 text-muted-foreground"
              onClick={() => removeTraversal(traversal.id)}
              aria-label="Remove traversal"
            >
              <XIcon className="size-3.5" />
            </Button>
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 px-2 text-muted-foreground"
        data-testid="add-context-traversal"
        onClick={onAddTraversal}
      >
        + Add traversal
      </Button>
    </div>
  );
}
