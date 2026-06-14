"use client";

import type { ContextFilterGroup } from "@ssota/contracts";
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

type ContextFilterGroupFormProps = {
  group: ContextFilterGroup;
  nodeCatalog: WorkflowNodeCatalogOption[];
  onChange: (group: ContextFilterGroup) => void;
};

export function ContextFilterGroupForm({
  group,
  nodeCatalog,
  onChange,
}: ContextFilterGroupFormProps) {
  const selectedEntry = nodeCatalog.find((entry) => entry.nodeType === group.nodeType);
  const propertyKeys = selectedEntry?.propertyKeys ?? [];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Node type</Label>
          <Select
            value={group.nodeType}
            onValueChange={(value) => {
              if (!value) return;
              onChange({
                ...group,
                nodeType: value,
                conditions: group.conditions.map((condition) => ({
                  ...condition,
                  propertyKey:
                    nodeCatalog.find((entry) => entry.nodeType === value)
                      ?.propertyKeys[0] ?? condition.propertyKey,
                })),
              });
            }}
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

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Match</Label>
          <Select
            value={group.combinator}
            onValueChange={(value) =>
              value &&
              onChange({
                ...group,
                combinator: value as ContextFilterGroup["combinator"],
              })
            }
          >
            <SelectTrigger className="h-8 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="and">All conditions</SelectItem>
              <SelectItem value="or">Any condition</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <ContextConditionList
        conditions={group.conditions}
        propertyKeys={propertyKeys}
        addLabel="+ Add filter rule"
        addTestId="add-filter-condition"
        onChange={(conditions) => onChange({ ...group, conditions })}
        createCondition={() => createFilterCondition(propertyKeys[0] ?? "title")}
      />
    </div>
  );
}
