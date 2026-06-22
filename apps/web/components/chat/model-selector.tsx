"use client";

import { CaretUpDownIcon, CheckIcon } from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@ssota/ui/components/ui/dropdown-menu";
import { cn } from "@ssota/ui/lib/utils";
import { MODEL_OPTIONS, modelsByProvider } from "@/lib/chat/models";

interface ModelSelectorProps {
  value: string;
  onChange: (modelId: string) => void;
  disabled?: boolean;
}

/** Compact model picker for the composer toolbar, grouped by provider. */
export function ModelSelector({ value, onChange, disabled }: ModelSelectorProps) {
  const groups = modelsByProvider();
  const active = MODEL_OPTIONS.find((m) => m.id === value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors",
          "hover:bg-secondary hover:text-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        <span className="max-w-[12rem] truncate">
          {active?.label ?? "모델 선택"}
        </span>
        <CaretUpDownIcon className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {groups.map((group, gi) => (
          <div key={group.provider}>
            {gi > 0 ? <DropdownMenuSeparator /> : null}
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              {group.provider}
            </DropdownMenuLabel>
            {group.models.map((model) => (
              <DropdownMenuItem
                key={model.id}
                onSelect={() => onChange(model.id)}
                className="flex items-center justify-between gap-2"
              >
                <span className="truncate">{model.label}</span>
                {model.id === value ? (
                  <CheckIcon className="size-3.5 shrink-0" />
                ) : null}
              </DropdownMenuItem>
            ))}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
