"use client";

import type { ContextFilterCondition } from "@ssota/contracts";
import { Button } from "@ssota/ui/components/ui/button";
import { ContextFilterConditionRow } from "@/components/workflows/context-filter-condition-row";

type ContextConditionListProps = {
  conditions: ContextFilterCondition[];
  propertyKeys: string[];
  addLabel: string;
  addTestId: string;
  onChange: (conditions: ContextFilterCondition[]) => void;
  createCondition: () => ContextFilterCondition;
};

export function ContextConditionList({
  conditions,
  propertyKeys,
  addLabel,
  addTestId,
  onChange,
  createCondition,
}: ContextConditionListProps) {
  return (
    <div className="space-y-1.5">
      <span className="text-xs text-muted-foreground">Where</span>

      {conditions.length === 0 ? (
        <p className="text-xs leading-snug text-muted-foreground">No checks yet.</p>
      ) : (
        <div className="space-y-1.5">
          {conditions.map((condition) => (
            <ContextFilterConditionRow
              key={condition.id}
              condition={condition}
              propertyKeys={propertyKeys}
              onChange={(next) =>
                onChange(
                  conditions.map((item) => (item.id === condition.id ? next : item)),
                )
              }
              onRemove={() =>
                onChange(conditions.filter((item) => item.id !== condition.id))
              }
            />
          ))}
        </div>
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
