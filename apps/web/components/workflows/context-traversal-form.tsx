"use client";

import type { ContextTraversalPlan } from "@ssota/contracts";
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

type ContextTraversalFormProps = {
  traversal: ContextTraversalPlan;
  nodeCatalog: WorkflowNodeCatalogOption[];
  edgeCatalog: WorkflowEdgeCatalogOption[];
  onChange: (traversal: ContextTraversalPlan) => void;
};

export function ContextTraversalForm({
  traversal,
  nodeCatalog,
  edgeCatalog,
  onChange,
}: ContextTraversalFormProps) {
  function patch(patch: Partial<ContextTraversalPlan>) {
    onChange({ ...traversal, ...patch });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs text-muted-foreground">Label (optional)</Label>
          <Input
            className="h-8"
            value={traversal.label ?? ""}
            placeholder={traversal.startNodeType}
            onChange={(event) =>
              patch({ label: event.target.value.trim() || undefined })
            }
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Start node type</Label>
          <Select
            value={traversal.startNodeType}
            onValueChange={(value) => value && patch({ startNodeType: value })}
          >
            <SelectTrigger className="h-8 w-full" data-testid="traversal-start-node-type">
              <SelectValue placeholder="Select node type" />
            </SelectTrigger>
            <SelectContent>
              {nodeCatalog.map((entry) => (
                <SelectItem key={entry.nodeType} value={entry.nodeType}>
                  {entry.label}
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
            <SelectTrigger className="h-8 w-full" data-testid="traversal-direction">
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
            data-testid="traversal-max-hops"
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
          <Label className="text-xs text-muted-foreground">Target node types</Label>
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
    </div>
  );
}
