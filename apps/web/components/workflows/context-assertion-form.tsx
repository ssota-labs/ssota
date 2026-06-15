"use client";

import type { ContextAssertion } from "@ssota/contracts";
import { Label } from "@ssota/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ssota/ui/components/ui/select";
import { ContextConditionList } from "@/components/workflows/context-condition-list";
import {
  createFilterCondition,
  type WorkflowNodeCatalogOption,
} from "@/lib/workflows/workflow-context-defaults";

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
  const selectedEntry = nodeCatalog.find(
    (entry) => entry.nodeType === assertion.nodeType,
  );
  const propertyKeys = selectedEntry?.propertyKeys ?? [];

  return (
    <div className="space-y-3 pt-2">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">On node type</Label>
          <Select
            value={assertion.nodeType}
            onValueChange={(value) => {
              if (!value) return;
              const nextKeys =
                nodeCatalog.find((entry) => entry.nodeType === value)
                  ?.propertyKeys ?? [];
              onChange({
                ...assertion,
                nodeType: value,
                conditions: assertion.conditions.map((condition) => ({
                  ...condition,
                  propertyKey: nextKeys[0] ?? condition.propertyKey,
                })),
              });
            }}
          >
            <SelectTrigger className="h-8 w-full" data-testid="assertion-node-type">
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
          <Label className="text-xs text-muted-foreground">Match</Label>
          <Select
            value={assertion.combinator}
            onValueChange={(value) =>
              value &&
              onChange({
                ...assertion,
                combinator: value as ContextAssertion["combinator"],
              })
            }
          >
            <SelectTrigger className="h-8 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="and">All checks</SelectItem>
              <SelectItem value="or">Any check</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <ContextConditionList
        conditions={assertion.conditions}
        propertyKeys={propertyKeys}
        addLabel="+ Add check"
        addTestId="add-assertion-check"
        onChange={(conditions) => onChange({ ...assertion, conditions })}
        createCondition={() =>
          createFilterCondition(propertyKeys[0] ?? "lifecycle_status")
        }
      />

      {/*
        Mode / enforcement — ContextAssertion 스키마 필드이나 런타임은 아직 항상 agentic + soft로 처리한다.
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Mode</Label>
          <Select
            value={assertion.mode}
            onValueChange={(value) =>
              value && onChange({ ...assertion, mode: value as ContextAssertion["mode"] })
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
              onChange({
                ...assertion,
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
      </div>
      */}
    </div>
  );
}
