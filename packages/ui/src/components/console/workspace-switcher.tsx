"use client";

import * as React from "react";
import { CaretUpDownIcon } from "@phosphor-icons/react";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Item, ItemContent, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type WorkspaceSwitcherOption = {
  id: string;
  label: string;
  initials?: string;
};

export type WorkspaceSwitcherItemProps = {
  option: WorkspaceSwitcherOption;
  active?: boolean;
  render?: React.ReactElement;
  className?: string;
  onClick?: () => void;
};

export type WorkspaceSwitcherProps = {
  currentLabel: string;
  sectionLabel: string;
  icon: React.ReactNode;
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

export function initialsFromWorkspaceLabel(label: string) {
  const parts = label.trim().split(/[\s-_]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return label.slice(0, 2).toUpperCase();
}

export function WorkspaceSwitcherItem({
  option,
  active = false,
  render,
  className,
  onClick,
}: WorkspaceSwitcherItemProps) {
  const initials = option.initials ?? initialsFromWorkspaceLabel(option.label);

  return (
    <Item
      size="sm"
      variant={active ? "muted" : "default"}
      className={cn(
        "cursor-pointer rounded-sm px-2 py-1.5",
        active && "bg-sidebar-accent font-medium",
        className,
      )}
      render={render}
      onClick={onClick}
    >
      <ItemMedia variant="icon">
        <Avatar size="sm">
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </ItemMedia>
      <ItemContent>
        <ItemTitle>{option.label}</ItemTitle>
      </ItemContent>
    </Item>
  );
}

export function WorkspaceSwitcher({
  currentLabel,
  sectionLabel,
  icon,
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
              "h-9 gap-2 px-2.5 font-normal",
              fullWidth && "w-full justify-between",
              triggerClassName,
            )}
          />
        }
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <span className="flex size-5 shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-4">
            {icon}
          </span>
          <span className={cn("truncate", fullWidth && "font-medium")}>
            {currentLabel}
          </span>
        </span>
        <CaretUpDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent
        align={align}
        side={side}
        className="cn-menu-translucent w-56 gap-1 p-1"
      >
        <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-muted-foreground">
          <span className="flex size-4 shrink-0 items-center justify-center [&_svg]:size-3.5">
            {icon}
          </span>
          <span>{sectionLabel}</span>
        </div>
        <ItemGroup className="gap-0.5">
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
              <WorkspaceSwitcherItem
                key={option.id}
                option={option}
                active={active}
                onClick={() => onOptionSelect?.(option)}
              />
            );
          })}
        </ItemGroup>
      </PopoverContent>
    </Popover>
  );
}
