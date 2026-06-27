"use client";

import { CaretRightIcon } from "@phosphor-icons/react";
import { cn } from "@ssota/ui/lib/utils";

export interface InstructionOption {
  id: string;
  name: string;
  description?: string;
}

type InstructionPickerListProps = {
  instructions: InstructionOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  disabled?: boolean;
};

export function InstructionPickerList({
  instructions,
  selectedId,
  onSelect,
  disabled = false,
}: InstructionPickerListProps) {
  return (
    <div
      className="border-border divide-border divide-y overflow-hidden rounded-lg border"
      data-testid="schedule-instruction-picker"
    >
      {instructions.map((instruction) => (
        <button
          key={instruction.id}
          type="button"
          disabled={disabled}
          data-testid={`schedule-instruction-item-${instruction.id}`}
          className={cn(
            "hover:bg-muted/40 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
            selectedId === instruction.id && "bg-muted/30",
            disabled && "pointer-events-none opacity-60",
          )}
          onClick={() => onSelect(instruction.id)}
        >
          <div className="min-w-0 flex-1 space-y-1">
            <span className="text-sm font-medium">{instruction.name}</span>
            {instruction.description ? (
              <p className="text-muted-foreground line-clamp-2 text-xs">
                {instruction.description}
              </p>
            ) : null}
          </div>
          <CaretRightIcon
            className="text-muted-foreground size-4 shrink-0"
            aria-hidden
          />
        </button>
      ))}
      {instructions.length === 0 ? (
        <p className="text-muted-foreground px-4 py-6 text-center text-sm">
          No agents available. Add a workflow instruction first.
        </p>
      ) : null}
    </div>
  );
}
