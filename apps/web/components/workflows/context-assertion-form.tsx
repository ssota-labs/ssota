"use client";

import type { ContextAssertion, ContextAssertionKind } from "@ssota/contracts";
import { Input } from "@ssota/ui/components/ui/input";
import { Label } from "@ssota/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ssota/ui/components/ui/select";
import type { WorkflowNodeCatalogOption } from "@/lib/workflows/workflow-context-defaults";

type ContextAssertionFormProps = {
  assertion: ContextAssertion;
  nodeCatalog: WorkflowNodeCatalogOption[];
  onChange: (assertion: ContextAssertion) => void;
};

export function ContextAssertionForm({
  assertion,
  nodeCatalog,
  onChange,
}: ContextAssertionFormProps) {
  function patch(patch: Partial<ContextAssertion>) {
    onChange({ ...assertion, ...patch } as ContextAssertion);
  }

  function updateParams(params: Record<string, unknown>) {
    onChange({ ...assertion, params } as ContextAssertion);
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
      </div>

      <AssertionParamsEditor
        kind={assertion.kind}
        params={assertion.params}
        nodeCatalog={nodeCatalog}
        onChange={updateParams}
      />
    </div>
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
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="space-y-1.5">
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
        </div>
        {kind === "count_at_least" ? (
          <div className="space-y-1.5">
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
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="space-y-1.5">
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
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Expected value</Label>
            <Input
              className="h-8"
              value={String(params.value ?? "")}
              onChange={(event) => onChange({ ...params, value: event.target.value })}
            />
          </div>
        ) : null}
      </div>
    );
  }

  if (kind === "status_equals") {
    return (
      <div className="space-y-1.5">
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
