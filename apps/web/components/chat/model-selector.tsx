"use client";

import { CaretUpDownIcon, CheckIcon } from "@phosphor-icons/react";
import { Button } from "@ssota/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
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
        render={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 gap-1 px-2 text-xs text-muted-foreground",
              "hover:bg-secondary hover:text-foreground",
            )}
          />
        }
      >
        <span className="max-w-[12rem] truncate">
          {active?.label ?? "모델 선택"}
        </span>
        <CaretUpDownIcon className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {groups.map((group, gi) => (
          <DropdownMenuGroup key={group.provider}>
            {gi > 0 ? <DropdownMenuSeparator /> : null}
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              {group.provider}
            </DropdownMenuLabel>
            {group.models.map((model) => (
              <DropdownMenuItem
                key={model.id}
                onClick={() => onChange(model.id)}
                className="flex items-center justify-between gap-2"
              >
                <span className="truncate">{model.label}</span>
                {model.id === value ? (
                  <CheckIcon className="size-3.5 shrink-0" />
                ) : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
