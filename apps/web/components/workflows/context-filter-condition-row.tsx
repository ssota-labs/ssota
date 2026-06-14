"use client";

import type {
  ContextFilterCondition,
  ContextFilterOperator,
} from "@ssota/contracts";
import { XIcon } from "@phosphor-icons/react";
import { Button } from "@ssota/ui/components/ui/button";
import { Input } from "@ssota/ui/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ssota/ui/components/ui/select";
import {
  CONTEXT_FILTER_OPERATOR_LABELS,
  operatorNeedsValue,
} from "@/lib/workflows/workflow-context-defaults";

type ContextFilterConditionRowProps = {
  condition: ContextFilterCondition;
  propertyKeys: string[];
  onChange: (condition: ContextFilterCondition) => void;
  onRemove: () => void;
};

export function ContextFilterConditionRow({
  condition,
  propertyKeys,
  onChange,
  onRemove,
}: ContextFilterConditionRowProps) {
  const keys = propertyKeys.length ? propertyKeys : ["title"];

  return (
    <div
      className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto]"
      data-testid={`condition-row-${condition.id}`}
    >
      <Select
        value={condition.propertyKey}
        onValueChange={(value) =>
          value && onChange({ ...condition, propertyKey: value })
        }
      >
        <SelectTrigger className="h-8 w-full">
          <SelectValue placeholder="Property" />
        </SelectTrigger>
        <SelectContent>
          {keys.map((key) => (
            <SelectItem key={key} value={key}>
              {key}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={condition.operator}
        onValueChange={(value) =>
          value &&
          onChange({
            ...condition,
            operator: value as ContextFilterOperator,
            value: operatorNeedsValue(value as ContextFilterOperator)
              ? condition.value
              : undefined,
          })
        }
      >
        <SelectTrigger className="h-8 w-full">
          <SelectValue placeholder="Operator" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(CONTEXT_FILTER_OPERATOR_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {operatorNeedsValue(condition.operator) ? (
        <Input
          className="h-8"
          value={condition.value ?? ""}
          placeholder="Value"
          onChange={(event) =>
            onChange({ ...condition, value: event.target.value })
          }
        />
      ) : (
        <div
          className="h-8 rounded-md border border-dashed bg-muted/20"
          aria-hidden
        />
      )}

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="shrink-0 text-muted-foreground"
        onClick={onRemove}
        aria-label="Remove check"
        data-testid={`remove-condition-${condition.id}`}
      >
        <XIcon className="size-3.5" />
      </Button>
    </div>
  );
}
