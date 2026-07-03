"use client";

import { useState } from "react";
import { CaretDownIcon, CheckIcon } from "@phosphor-icons/react";
import { Button } from "@ssota/ui/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@ssota/ui/components/ui/popover";
import { cn } from "@ssota/ui/lib/utils";

export interface InstructionOption {
  id: string;
  name: string;
  description?: string;
}

type InstructionPickerSelectProps = {
  instructions: InstructionOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  disabled?: boolean;
};

export function InstructionPickerSelect({
  instructions,
  selectedId,
  onSelect,
  disabled = false,
}: InstructionPickerSelectProps) {
  const [open, setOpen] = useState(false);
  const selected = instructions.find((entry) => entry.id === selectedId);

  function handleSelect(id: string) {
    onSelect(id);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        data-testid="schedule-instruction-picker"
        render={
          <Button
            type="button"
            variant="outline"
            className="h-auto min-h-9 w-full justify-between gap-2 px-3 py-2 font-normal"
          />
        }
      >
        <span className="min-w-0 flex-1 text-left">
          {selected ? (
            <span className="block truncate text-sm">{selected.name}</span>
          ) : (
            <span className="text-muted-foreground text-sm">
              Select an agent…
            </span>
          )}
        </span>
        <CaretDownIcon className="text-muted-foreground size-4 shrink-0" />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className="w-[var(--anchor-width)] !flex-col !gap-0 !p-0"
        data-testid="schedule-instruction-picker-content"
      >
        <div className="border-border divide-border max-h-60 divide-y overflow-y-auto rounded-md border">
          {instructions.map((instruction) => {
            const isSelected = instruction.id === selectedId;
            return (
              <button
                key={instruction.id}
                type="button"
                data-testid={`schedule-instruction-item-${instruction.id}`}
                className={cn(
                  "hover:bg-muted/40 flex w-full items-start gap-2 px-3 py-2.5 text-left transition-colors",
                  isSelected && "bg-muted/30",
                )}
                onClick={() => handleSelect(instruction.id)}
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <span className="text-sm font-medium">{instruction.name}</span>
                  {instruction.description ? (
                    <p className="text-muted-foreground line-clamp-2 text-xs">
                      {instruction.description}
                    </p>
                  ) : null}
                </div>
                {isSelected ? (
                  <CheckIcon
                    className="text-primary mt-0.5 size-4 shrink-0"
                    aria-hidden
                  />
                ) : null}
              </button>
            );
          })}
          {instructions.length === 0 ? (
            <p className="text-muted-foreground px-3 py-4 text-center text-sm">
              No agents available. Add an agent definition first.
            </p>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
