"use client";

import type { ContextFilterCondition } from "@ssota/contracts";
import { Button } from "@ssota/ui/components/ui/button";
import { ContextFilterConditionRow } from "@/components/workflows/context-filter-condition-row";

type ContextConditionListProps = {
  conditions: ContextFilterCondition[];
  propertyKeys: string[];
  itemLabel: string;
  addLabel: string;
  addTestId: string;
  onChange: (conditions: ContextFilterCondition[]) => void;
  createCondition: () => ContextFilterCondition;
};

export function ContextConditionList({
  conditions,
  propertyKeys,
  itemLabel,
  addLabel,
  addTestId,
  onChange,
  createCondition,
}: ContextConditionListProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">Where</span>
      </div>

      {conditions.length === 0 ? (
        <p className="rounded-md border border-dashed bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
          No {itemLabel.toLowerCase()}s yet.
        </p>
      ) : (
        conditions.map((condition, index) => (
          <ContextFilterConditionRow
            key={condition.id}
            condition={condition}
            propertyKeys={propertyKeys}
            itemLabel={`${itemLabel} ${index + 1}`}
            onChange={(next) =>
              onChange(
                conditions.map((item) => (item.id === condition.id ? next : item)),
              )
            }
            onRemove={() =>
              onChange(conditions.filter((item) => item.id !== condition.id))
            }
          />
        ))
      )}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 px-2 text-muted-foreground"
        data-testid={addTestId}
        onClick={() => onChange([...conditions, createCondition()])}
      >
        {addLabel}
      </Button>
    </div>
  );
}
