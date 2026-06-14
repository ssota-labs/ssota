"use client";

import type { ContextAssertion, ContextAssertionKind } from "@ssota/contracts";
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
import {
  getAssertionKindLabel,
  type WorkflowNodeCatalogOption,
} from "@/lib/workflows/workflow-context-defaults";

type ContextAssertionEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assertion: ContextAssertion | null;
  nodeCatalog: WorkflowNodeCatalogOption[];
  onSave: (assertion: ContextAssertion) => void;
};

export function ContextAssertionEditDialog({
  open,
  onOpenChange,
  assertion,
  nodeCatalog,
  onSave,
}: ContextAssertionEditDialogProps) {
  if (!assertion) return null;

  function patch(patch: Partial<ContextAssertion>) {
    onSave({ ...assertion, ...patch } as ContextAssertion);
  }

  function updateParams(params: Record<string, unknown>) {
    onSave({ ...assertion, params } as ContextAssertion);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <DialogTitle className="text-sm font-medium">Edit assertion</DialogTitle>
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
            <Label className="text-xs text-muted-foreground">Kind</Label>
            <Input
              className="h-8"
              value={getAssertionKindLabel(assertion.kind)}
              readOnly
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs text-muted-foreground">Label</Label>
            <Input
              className="h-8"
              value={assertion.label ?? ""}
              placeholder={assertion.kind}
              onChange={(event) =>
                patch({ label: event.target.value.trim() || undefined })
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Mode</Label>
            <Select
              value={assertion.mode}
              onValueChange={(value) =>
                value && patch({ mode: value as ContextAssertion["mode"] })
              }
            >
              <SelectTrigger className="h-8 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="agentic">Agentic</SelectItem>
                <SelectItem value="deterministic">Deterministic</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Enforcement</Label>
            <Select
              value={assertion.enforcement}
              onValueChange={(value) =>
                value &&
                patch({ enforcement: value as ContextAssertion["enforcement"] })
              }
            >
              <SelectTrigger className="h-8 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="soft">Soft</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <AssertionParamsEditor
            kind={assertion.kind}
            params={assertion.params}
            nodeCatalog={nodeCatalog}
            onChange={updateParams}
          />
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

function AssertionParamsEditor({
  kind,
  params,
  nodeCatalog,
  onChange,
}: {
  kind: ContextAssertionKind;
  params: Record<string, unknown>;
  nodeCatalog: WorkflowNodeCatalogOption[];
  onChange: (params: Record<string, unknown>) => void;
}) {
  if (kind === "node_exists" || kind === "count_at_least") {
    return (
      <div className="space-y-1.5 sm:col-span-2">
        <Label className="text-xs text-muted-foreground">Node type</Label>
        <Select
          value={String(params.nodeType ?? "")}
          onValueChange={(value) => onChange({ ...params, nodeType: value ?? "" })}
        >
          <SelectTrigger className="h-8 w-full">
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
        {kind === "count_at_least" ? (
          <div className="space-y-1.5 pt-2">
            <Label className="text-xs text-muted-foreground">Minimum count</Label>
            <Input
              className="h-8"
              type="number"
              min={1}
              value={String(params.count ?? 1)}
              onChange={(event) =>
                onChange({ ...params, count: Number(event.target.value) || 1 })
              }
            />
          </div>
        ) : null}
      </div>
    );
  }

  if (kind === "property_present" || kind === "property_equals") {
    return (
      <>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs text-muted-foreground">Property key</Label>
          <Input
            className="h-8"
            value={String(params.propertyKey ?? "")}
            onChange={(event) =>
              onChange({ ...params, propertyKey: event.target.value })
            }
          />
        </div>
        {kind === "property_equals" ? (
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs text-muted-foreground">Expected value</Label>
            <Input
              className="h-8"
              value={String(params.value ?? "")}
              onChange={(event) => onChange({ ...params, value: event.target.value })}
            />
          </div>
        ) : null}
      </>
    );
  }

  if (kind === "status_equals") {
    return (
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="assertion-status" className="text-xs text-muted-foreground">
          Status
        </Label>
        <Input
          id="assertion-status"
          className="h-8"
          value={String(params.status ?? "")}
          onChange={(event) => onChange({ ...params, status: event.target.value })}
        />
      </div>
    );
  }

  return null;
}
