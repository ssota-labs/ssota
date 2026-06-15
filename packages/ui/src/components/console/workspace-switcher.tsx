"use client";

import * as React from "react";
import { CaretUpDownIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Item, ItemGroup } from "@/components/ui/item";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type WorkspaceSwitcherOption = {
  id: string;
  label: string;
};

export type WorkspaceSwitcherProps = {
  currentLabel: string;
  sectionLabel: string;
  options: WorkspaceSwitcherOption[];
  activeOptionId?: string;
  onOptionSelect?: (option: WorkspaceSwitcherOption) => void;
  renderOption?: (
    option: WorkspaceSwitcherOption,
    state: { active: boolean },
  ) => React.ReactElement;
  triggerClassName?: string;
  fullWidth?: boolean;
  align?: "start" | "center" | "end";
  side?: "top" | "bottom" | "left" | "right";
  "aria-label"?: string;
};

export function WorkspaceSwitcher({
  currentLabel,
  sectionLabel,
  options,
  activeOptionId,
  onOptionSelect,
  renderOption,
  triggerClassName,
  fullWidth = false,
  align = "start",
  side = "bottom",
  "aria-label": ariaLabel,
}: WorkspaceSwitcherProps) {
  return (
    <Popover>
      <PopoverTrigger
        aria-label={ariaLabel ?? sectionLabel}
        render={
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 gap-1 px-2 font-normal",
              fullWidth && "w-full justify-between",
              triggerClassName,
            )}
          />
        }
      >
        <span className={cn("truncate", fullWidth && "font-medium")}>
          {currentLabel}
        </span>
        <CaretUpDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent
        align={align}
        side={side}
        className="cn-menu-translucent w-56 gap-0 p-1"
      >
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          {sectionLabel}
        </div>
        <ItemGroup>
          {options.map((option) => {
            const active = option.id === activeOptionId;
            if (renderOption) {
              return (
                <React.Fragment key={option.id}>
                  {renderOption(option, { active })}
                </React.Fragment>
              );
            }
            return (
              <Item
                key={option.id}
                size="sm"
                variant={active ? "muted" : "default"}
                className={cn(
                  "cursor-pointer rounded-sm px-2",
                  active && "bg-sidebar-accent font-medium",
                )}
                onClick={() => onOptionSelect?.(option)}
              >
                {option.label}
              </Item>
            );
          })}
        </ItemGroup>
      </PopoverContent>
    </Popover>
  );
}
