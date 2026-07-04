"use client";

import { useState } from "react";
import { CaretDownIcon, CheckIcon, SparkleIcon } from "@phosphor-icons/react";
import { Button } from "@ssota/ui/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@ssota/ui/components/ui/popover";
import { cn } from "@ssota/ui/lib/utils";
import {
  DEFAULT_MODEL_ID,
  MODEL_OPTIONS,
  modelsByProvider,
} from "@/lib/chat/models";

function ModelProviderMark() {
  return (
    <SparkleIcon
      className="text-muted-foreground size-4 shrink-0"
      aria-hidden
    />
  );
}

type AgentModelPickerProps = {
  value: string;
  onChange: (modelId: string) => void;
  disabled?: boolean;
};

/** Compact model picker for agent settings (Notion-style popover on the right). */
export function AgentModelPicker({
  value,
  onChange,
  disabled = false,
}: AgentModelPickerProps) {
  const [open, setOpen] = useState(false);
  const groups = modelsByProvider();
  const active =
    MODEL_OPTIONS.find((model) => model.id === value) ??
    MODEL_OPTIONS.find((model) => model.id === DEFAULT_MODEL_ID);

  function handleSelect(modelId: string) {
    onChange(modelId);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        data-testid="agent-model-picker"
        aria-label="Model"
        render={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground h-8 shrink-0 gap-1.5 px-2 font-normal"
          />
        }
      >
        {active ? (
          <>
            <ModelProviderMark />
            <span className="max-w-[10rem] truncate text-sm">{active.label}</span>
          </>
        ) : (
          <span className="text-sm">Select model</span>
        )}
        <CaretDownIcon className="size-3.5 shrink-0 opacity-60" aria-hidden />
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={4}
        className="w-64 !flex-col !gap-0 !p-1"
        data-testid="agent-model-picker-content"
      >
        {groups.map((group, groupIndex) => (
          <div key={group.provider}>
            {groupIndex > 0 ? (
              <div className="bg-border my-1 h-px" aria-hidden />
            ) : null}
            <p className="text-muted-foreground px-2 py-1.5 text-xs font-medium">
              {group.provider}
            </p>
            {group.models.map((model) => {
              const isSelected = model.id === (value || DEFAULT_MODEL_ID);
              return (
                <button
                  key={model.id}
                  type="button"
                  data-testid={`agent-model-option-${model.id.replace(/\//g, "--")}`}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted",
                    isSelected && "bg-muted/60",
                  )}
                  onClick={() => handleSelect(model.id)}
                >
                  <ModelProviderMark />
                  <span className="min-w-0 flex-1 truncate">{model.label}</span>
                  {isSelected ? (
                    <CheckIcon
                      className="text-primary size-4 shrink-0"
                      aria-hidden
                    />
                  ) : (
                    <span className="size-4 shrink-0" aria-hidden />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}
