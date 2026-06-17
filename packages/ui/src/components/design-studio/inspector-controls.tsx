"use client";

import type { ReactNode } from "react";
import { useRef, useState } from "react";
import {
  CaretDownIcon,
  CheckIcon,
  SlidersHorizontalIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type InspectorPopoverOption = {
  value: string;
  label: string;
  icon?: ReactNode;
};

export type InspectorPresetOption = {
  value: string;
  label: string;
};

type InspectorPopoverPickerProps = {
  value: string | undefined;
  placeholder?: string;
  options: InspectorPopoverOption[];
  onChange: (value: string | undefined) => void;
  className?: string;
  "aria-label"?: string;
};

export function InspectorPopoverPicker({
  value,
  placeholder = "Default",
  options,
  onChange,
  className,
  "aria-label": ariaLabel,
}: InspectorPopoverPickerProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={ariaLabel}
        className={cn(
          "cn-input flex h-9 w-full min-w-0 items-center gap-2 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none hover:bg-muted/40",
          className,
        )}
      >
        {selected ? (
          <>
            {selected.icon ? (
              <span className="shrink-0 text-muted-foreground">{selected.icon}</span>
            ) : null}
            <span className="min-w-0 flex-1 truncate text-left">
              {selected.label}
            </span>
          </>
        ) : (
          <span className="min-w-0 flex-1 truncate text-left text-muted-foreground">
            {placeholder}
          </span>
        )}
        <CaretDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--anchor-width)] p-1">
        <InspectorPopoverList
          options={options}
          value={value}
          onSelect={(nextValue) => {
            onChange(nextValue || undefined);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

type InspectorPopoverListProps = {
  options: InspectorPopoverOption[];
  value?: string;
  onSelect: (value: string) => void;
};

function InspectorPopoverList({
  options,
  value,
  onSelect,
}: InspectorPopoverListProps) {
  return (
    <div className="flex flex-col gap-0.5">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            className={cn(
              "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted",
              active && "bg-muted",
            )}
            onClick={() => onSelect(option.value)}
          >
            {option.icon ? (
              <span className="flex size-4 shrink-0 items-center justify-center text-muted-foreground">
                {option.icon}
              </span>
            ) : null}
            <span className="min-w-0 flex-1 truncate text-left">
              {option.label}
            </span>
            {active ? (
              <CheckIcon className="size-3.5 shrink-0 text-muted-foreground" />
            ) : (
              <span className="size-3.5 shrink-0" />
            )}
          </button>
        );
      })}
    </div>
  );
}

type InspectorPresetListProps = {
  options: InspectorPresetOption[];
  value?: string;
  onSelect: (value: string) => void;
};

function InspectorPresetList({
  options,
  value,
  onSelect,
}: InspectorPresetListProps) {
  return (
    <div className="flex flex-col gap-0.5">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            className={cn(
              "flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm hover:bg-muted",
              active && "bg-muted",
            )}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onSelect(option.value)}
          >
            <span className="truncate">{option.label}</span>
            {active ? (
              <CheckIcon className="size-3.5 shrink-0 text-muted-foreground" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

type InspectorNumberInputProps = {
  value: string;
  unit?: "px" | "em";
  placeholder?: string;
  presets: InspectorPresetOption[];
  onChange: (value: string) => void;
  "aria-label"?: string;
};

export function InspectorNumberInput({
  value,
  unit,
  placeholder,
  presets,
  onChange,
  "aria-label": ariaLabel,
}: InspectorNumberInputProps) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <div ref={anchorRef} className="w-full">
        <InputGroup>
          <InputGroupInput
            aria-label={ariaLabel}
            type="number"
            inputMode="decimal"
            step="any"
            value={value}
            placeholder={placeholder}
            onChange={(event) => onChange(event.target.value)}
            onFocus={() => setOpen(true)}
            onBlur={() => {
              window.setTimeout(() => setOpen(false), 0);
            }}
          />
          {unit ? (
            <InputGroupAddon align="inline-end">
              <InputGroupText className="text-xs text-muted-foreground">
                {unit}
              </InputGroupText>
            </InputGroupAddon>
          ) : null}
        </InputGroup>
      </div>
      <PopoverContent
        anchor={anchorRef}
        align="start"
        className="w-[var(--anchor-width)] p-1"
      >
        <InspectorPresetList
          options={presets}
          value={value}
          onSelect={(nextValue) => {
            onChange(nextValue);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

export type InspectorToggleOption = {
  value: string;
  label?: string;
  icon?: ReactNode;
  "aria-label"?: string;
  tooltip?: string;
};

type InspectorToggleRowProps = {
  value: string | undefined;
  options: InspectorToggleOption[];
  onChange: (value: string | undefined) => void;
  columns?: number;
};

export function InspectorToggleRow({
  value,
  options,
  onChange,
  columns = options.length,
}: InspectorToggleRowProps) {
  return (
    <ToggleGroup
      value={value ? [value] : []}
      onValueChange={(values) => {
        const next = values.at(-1);
        onChange(next || undefined);
      }}
      spacing={0}
      variant="outline"
      className={cn("grid w-full", {
        "grid-cols-2": columns === 2,
        "grid-cols-4": columns === 4,
      })}
    >
      {options.map((option) => {
        const item = (
          <ToggleGroupItem
            value={option.value}
            aria-label={option["aria-label"] ?? option.label}
            className="min-w-0 flex-1 px-0"
          >
            {option.icon ?? (
              <span className="text-xs font-medium">{option.label}</span>
            )}
          </ToggleGroupItem>
        );

        if (!option.tooltip) {
          return (
            <ToggleGroupItem
              key={option.value}
              value={option.value}
              aria-label={option["aria-label"] ?? option.label}
              className="min-w-0 flex-1 px-0"
            >
              {option.icon ?? (
                <span className="text-xs font-medium">{option.label}</span>
              )}
            </ToggleGroupItem>
          );
        }

        return (
          <Tooltip key={option.value}>
            <TooltipTrigger render={item} />
            <TooltipContent side="top">{option.tooltip}</TooltipContent>
          </Tooltip>
        );
      })}
    </ToggleGroup>
  );
}

type InspectorFontFamilyRowProps = {
  value: string | undefined;
  options: InspectorPopoverOption[];
  onChange: (value: string | undefined) => void;
};

export function InspectorFontFamilyRow({
  value,
  options,
  onChange,
}: InspectorFontFamilyRowProps) {
  return (
    <div className="flex items-center gap-1.5">
      <InspectorPopoverPicker
        aria-label="Font family"
        className="min-w-0 flex-1"
        value={value}
        placeholder="Default"
        options={options}
        onChange={onChange}
      />
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        className="shrink-0"
        aria-label="Font settings"
        disabled
      >
        <SlidersHorizontalIcon className="size-3.5" />
      </Button>
    </div>
  );
}
