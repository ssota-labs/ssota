"use client";

import type { ContextFilterGroup } from "@ssota/contracts";
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
import { ContextFilterConditionRow } from "@/components/workflows/context-filter-condition-row";
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

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Label (optional)</Label>
        <Input
          className="h-8"
          value={group.label ?? ""}
          placeholder={group.nodeType}
          onChange={(event) =>
            onChange({
              ...group,
              label: event.target.value.trim() || undefined,
            })
          }
        />
      </div>

      <div className="space-y-2">
        {group.conditions.map((condition, index) => (
          <ContextFilterConditionRow
            key={condition.id}
            condition={condition}
            propertyKeys={propertyKeys}
            showWhereLabel={index === 0}
            onChange={(next) =>
              onChange({
                ...group,
                conditions: group.conditions.map((item) =>
                  item.id === condition.id ? next : item,
                ),
              })
            }
            onRemove={() =>
              onChange({
                ...group,
                conditions: group.conditions.filter((item) => item.id !== condition.id),
              })
            }
          />
        ))}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-muted-foreground"
          data-testid="add-filter-condition"
          onClick={() =>
            onChange({
              ...group,
              conditions: [
                ...group.conditions,
                createFilterCondition(propertyKeys[0] ?? "title"),
              ],
            })
          }
        >
          + Add filter rule
        </Button>
      </div>
    </div>
  );
}
