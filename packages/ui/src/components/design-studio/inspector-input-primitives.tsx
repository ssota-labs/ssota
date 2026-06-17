"use client";

import type { PointerEvent, ReactNode, RefObject, WheelEvent } from "react";
import { useRef, useState } from "react";
import { CaretDownIcon, CheckIcon } from "@phosphor-icons/react";
import {
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
} from "@/components/ui/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type InspectorNumberUnit = "px" | "%" | "em";

export type InspectorPresetOption = {
  value: string;
  label: string;
};

const inspectorPopoverContentClass =
  "cn-popover-menu w-[var(--anchor-width)]";

export function formatPresetLabel(
  label: string,
  unit?: InspectorNumberUnit,
): string {
  if (!unit) return label;
  if (/^(normal|inherit|auto)$/i.test(label)) return label;
  if (label.endsWith(unit)) return label;
  return `${label}${unit}`;
}

type InspectorPresetListProps = {
  options: InspectorPresetOption[];
  value?: string;
  unit?: InspectorNumberUnit;
  onSelect: (value: string) => void;
};

export function InspectorPresetList({
  options,
  value,
  unit,
  onSelect,
}: InspectorPresetListProps) {
  return (
    <div className="flex flex-col gap-1 p-1">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            className={cn(
              "flex w-full items-center justify-between rounded-sm px-1.5 py-1 text-xs hover:bg-muted",
              active && "bg-muted",
            )}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onSelect(option.value)}
          >
            <span className="truncate text-muted-foreground">
              {formatPresetLabel(option.label, unit)}
            </span>
            {active ? (
              <CheckIcon className="size-3 shrink-0 text-muted-foreground" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function InspectorPresetTrigger({
  "aria-label": ariaLabel,
}: {
  "aria-label": string;
}) {
  return (
    <PopoverTrigger
      nativeButton
      aria-label={ariaLabel}
      render={
        <InputGroupButton type="button" size="icon-xs" variant="ghost" />
      }
    >
      <CaretDownIcon className="size-3.5 text-muted-foreground" />
    </PopoverTrigger>
  );
}

type InspectorAnchorPopoverProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anchorRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
  content: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  anchorClassName?: string;
};

export function InspectorAnchorPopover({
  open,
  onOpenChange,
  anchorRef,
  children,
  content,
  side = "bottom",
  anchorClassName,
}: InspectorAnchorPopoverProps) {
  return (
    <Popover open={open} onOpenChange={onOpenChange} modal={false}>
      <div
        ref={anchorRef}
        className={cn("min-w-0 flex-1 items-center", anchorClassName ?? "w-full")}
      >
        {children}
      </div>
      <PopoverContent
        anchor={anchorRef}
        align="start"
        side={side}
        className={inspectorPopoverContentClass}
        initialFocus={false}
        finalFocus={false}
      >
        {content}
      </PopoverContent>
    </Popover>
  );
}

type InspectorUnitSelectorProps = {
  unit: InspectorNumberUnit;
  units: readonly InspectorNumberUnit[];
  onUnitChange?: (unit: InspectorNumberUnit) => void;
  "aria-label"?: string;
};

export function InspectorUnitSelector({
  unit,
  units,
  onUnitChange,
  "aria-label": ariaLabel,
}: InspectorUnitSelectorProps) {
  const [open, setOpen] = useState(false);
  const selectable = units.length > 1 && onUnitChange;

  if (!selectable) {
    return (
      <InputGroupText className="text-xs text-muted-foreground">
        {unit}
      </InputGroupText>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger
        nativeButton
        aria-label={ariaLabel ?? "Unit"}
        render={
          <button
            type="button"
            className="cn-input-group-text flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground"
            onPointerDown={(event) => event.stopPropagation()}
          />
        }
      >
        {unit}
        <CaretDownIcon className="size-2.5 shrink-0" />
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="cn-popover-menu w-auto min-w-16 p-0.5"
        initialFocus={false}
        finalFocus={false}
      >
        {units.map((option) => {
          const active = option === unit;
          return (
            <button
              key={option}
              type="button"
              className={cn(
                "flex w-full items-center justify-between rounded-sm px-2 py-1 text-sm hover:bg-muted",
                active && "bg-muted",
              )}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onUnitChange(option);
                setOpen(false);
              }}
            >
              <span>{option}</span>
              {active ? (
                <CheckIcon className="size-3.5 shrink-0 text-muted-foreground" />
              ) : (
                <span className="size-3.5 shrink-0" />
              )}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

export function applyNumericBounds(
  value: string,
  min?: number,
  max?: number,
): string {
  const trimmed = value.trim();
  if (!trimmed) return value;
  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric)) return value;
  let next = numeric;
  if (min !== undefined) next = Math.max(min, next);
  if (max !== undefined) next = Math.min(max, next);
  return String(next);
}

export function adjustNumberByWheel(
  event: WheelEvent,
  value: string,
  onChange: (value: string) => void,
  step: number,
  min?: number,
  max?: number,
) {
  const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY);
  const delta = horizontal ? event.deltaX : event.deltaY;
  if (delta === 0) return;

  event.preventDefault();
  event.stopPropagation();

  const current = value.trim() === "" ? 0 : Number(value);
  if (!Number.isFinite(current)) return;

  const direction = horizontal ? (delta > 0 ? 1 : -1) : delta < 0 ? 1 : -1;
  onChange(
    applyNumericBounds(String(current + direction * step), min, max),
  );
}

type InspectorScrubberHandleProps = {
  value: string;
  step: number;
  min?: number;
  max?: number;
  onChange: (value: string) => void;
  "aria-label"?: string;
};

export function InspectorScrubberHandle({
  value,
  step,
  min,
  max,
  onChange,
  "aria-label": ariaLabel,
}: InspectorScrubberHandleProps) {
  const dragRef = useRef<{ originX: number; originValue: number } | null>(null);

  const endDrag = (event: PointerEvent<HTMLButtonElement>) => {
    dragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const current = value.trim() === "" ? 0 : Number(value);
    if (!Number.isFinite(current)) return;
    dragRef.current = { originX: event.clientX, originValue: current };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current) return;
    const deltaX = event.clientX - dragRef.current.originX;
    const stepSize = event.shiftKey ? step * 10 : step;
    const next =
      dragRef.current.originValue + Math.round(deltaX / 4) * stepSize;
    onChange(applyNumericBounds(String(next), min, max));
  };

  return (
    <InputGroupAddon align="inline-start">
      <InputGroupButton
        type="button"
        size="icon-xs"
        variant="ghost"
        className="cursor-ew-resize touch-none px-1"
        aria-label={ariaLabel ? `${ariaLabel} scrub` : "Adjust value"}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <span className="flex items-center gap-px" aria-hidden>
          <span className="h-3 w-px rounded-full bg-muted-foreground/70" />
          <span className="h-3 w-px rounded-full bg-muted-foreground/70" />
        </span>
      </InputGroupButton>
    </InputGroupAddon>
  );
}
