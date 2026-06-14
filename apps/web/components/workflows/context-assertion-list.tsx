"use client";

import type { ContextAssertion, ContextAssertionKind } from "@ssota/contracts";
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
import {
  getAssertionKindLabel,
  type WorkflowNodeCatalogOption,
} from "@/lib/workflows/workflow-context-defaults";

type ContextAssertionListProps = {
  assertions: ContextAssertion[];
  nodeCatalog: WorkflowNodeCatalogOption[];
  onChange: (assertions: ContextAssertion[]) => void;
  onAddAssertion: () => void;
};

export function ContextAssertionList({
  assertions,
  nodeCatalog,
  onChange,
  onAddAssertion,
}: ContextAssertionListProps) {
  function updateAssertion(id: string, patch: Partial<ContextAssertion>) {
    onChange(
      assertions.map((assertion) =>
        assertion.id === id ? { ...assertion, ...patch } : assertion,
      ),
    );
  }

  function updateParams(id: string, params: Record<string, unknown>) {
    onChange(
      assertions.map((assertion) =>
        assertion.id === id ? { ...assertion, params } : assertion,
      ),
    );
  }

  function removeAssertion(id: string) {
    onChange(assertions.filter((assertion) => assertion.id !== id));
  }

  return (
    <div className="space-y-3">
      {assertions.map((assertion) => (
        <div
          key={assertion.id}
          className="rounded-lg border bg-card p-3"
          data-testid={`assertion-${assertion.id}`}
        >
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="grid flex-1 gap-3 sm:grid-cols-2">
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
                    updateAssertion(assertion.id, {
                      label: event.target.value.trim() || undefined,
                    })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Mode</Label>
                <Select
                  value={assertion.mode}
                  onValueChange={(value) =>
                    value &&
                    updateAssertion(assertion.id, {
                      mode: value as ContextAssertion["mode"],
                    })
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
                    updateAssertion(assertion.id, {
                      enforcement: value as ContextAssertion["enforcement"],
                    })
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
                onChange={(params) => updateParams(assertion.id, params)}
              />
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0 text-muted-foreground"
              onClick={() => removeAssertion(assertion.id)}
              aria-label="Remove assertion"
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
        data-testid="add-context-assertion"
        onClick={onAddAssertion}
      >
        + Add assertion
      </Button>
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
        <Label className="text-xs text-muted-foreground">Status</Label>
        <Input
          className="h-8"
          value={String(params.status ?? "")}
          onChange={(event) => onChange({ ...params, status: event.target.value })}
        />
      </div>
    );
  }

  return null;
}
