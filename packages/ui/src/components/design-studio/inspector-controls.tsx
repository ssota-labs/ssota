"use client";

import type { ReactNode } from "react";
import { useLayoutEffect, useRef, useState } from "react";
import {
  CaretDownIcon,
  CheckIcon,
  SlidersHorizontalIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupInput,
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
import type { InspectorColorOption } from "./tailwind-theme-colors";
import {
  InspectorAnchorPopover,
  useInspectorPresetPopoverToggle,
} from "./inspector-input-primitives";

export type { InspectorColorOption } from "./tailwind-theme-colors";

export type InspectorPopoverOption = {
  value: string;
  label: string;
  icon?: ReactNode;
};

const inspectorPopoverContentClass =
  "cn-popover-menu w-[var(--anchor-width)]";

/** Native color input — circle swatch only, no text-input chrome (cn-input border box). */
const inspectorNativeColorPickerClass =
  "size-9 shrink-0 cursor-pointer appearance-none overflow-hidden rounded-full border-0 bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-moz-color-swatch]:rounded-full [&::-moz-color-swatch]:border-none [&::-webkit-color-swatch-wrapper]:rounded-full [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:size-full [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-none";

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
    <Popover open={open} onOpenChange={setOpen} modal={false}>
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
      <PopoverContent
        align="start"
        className={inspectorPopoverContentClass}
        initialFocus={false}
        finalFocus={false}
      >
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
    <div className="flex flex-col gap-0 p-0.5">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            className={cn(
              "flex w-full items-center gap-2 rounded-sm px-1.5 py-1 text-sm hover:bg-muted",
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

function ColorSwatch({
  cssVar,
  swatchClass,
}: Pick<InspectorColorOption, "cssVar" | "swatchClass">) {
  if (cssVar) {
    return (
      <span
        className="size-4 shrink-0 rounded-sm border border-border"
        style={{ backgroundColor: `var(${cssVar})` }}
      />
    );
  }

  return (
    <span
      className={cn(
        "size-4 shrink-0 rounded-sm border border-border",
        swatchClass ?? "bg-muted",
      )}
    />
  );
}

function rgbStringToHex(color: string): string | null {
  const rgba = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!rgba) return null;
  const r = Number(rgba[1]).toString(16).padStart(2, "0");
  const g = Number(rgba[2]).toString(16).padStart(2, "0");
  const b = Number(rgba[3]).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`;
}

function toHexColor(color: string): string {
  if (color.startsWith("#")) {
    return color.length === 4
      ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
      : color.slice(0, 7);
  }

  return rgbStringToHex(color) ?? "#000000";
}

/** rgb/oklch 등 브라우저가 이해하는 CSS color 문자열을 #rrggbb로 변환합니다. */
function cssColorToHex(color: string): string {
  const trimmed = color.trim();
  if (!trimmed) return "#000000";
  if (trimmed.startsWith("#")) return toHexColor(trimmed);

  const fromRgb = rgbStringToHex(trimmed);
  if (fromRgb) return fromRgb;

  if (typeof document === "undefined") return "#000000";

  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return "#000000";
    ctx.fillStyle = trimmed;
    const normalized = ctx.fillStyle;
    if (normalized.startsWith("#")) return toHexColor(normalized);
    return rgbStringToHex(normalized) ?? "#000000";
  } catch {
    return "#000000";
  }
}

function resolveColorPickerHex(
  value: string,
  presets: InspectorColorOption[],
): string {
  const trimmed = value.trim();
  if (!trimmed) return "#000000";
  if (isDirectColorValue(trimmed)) {
    return cssColorToHex(trimmed);
  }

  const option = resolveColorOption(trimmed, presets);
  if (!option || typeof document === "undefined") {
    return cssColorToHex(trimmed);
  }

  if (option.cssVar) {
    const fromVar = cssColorToHexViaDom(`var(${option.cssVar})`);
    if (fromVar !== "#000000") return fromVar;

    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue(option.cssVar)
      .trim();
    if (raw) {
      const fromRaw = cssColorToHexViaDom(raw);
      if (fromRaw !== "#000000") return fromRaw;
    }

    return fromVar;
  }

  if (option.swatchClass) {
    return cssColorToHexViaDom(resolveSwatchClassColor(option.swatchClass));
  }

  return cssColorToHex(trimmed);
}

function cssColorToHexViaDom(color: string): string {
  const trimmed = color.trim();
  if (!trimmed) return "#000000";
  if (trimmed.startsWith("#")) return toHexColor(trimmed);

  const fromRgb = rgbStringToHex(trimmed);
  if (fromRgb) return fromRgb;

  if (typeof document === "undefined") return cssColorToHex(trimmed);

  const probe = document.createElement("div");
  probe.style.position = "fixed";
  probe.style.visibility = "hidden";
  probe.style.pointerEvents = "none";
  probe.style.backgroundColor = trimmed;
  document.documentElement.appendChild(probe);

  try {
    const computed = getComputedStyle(probe).backgroundColor;
    if (computed && computed !== "rgba(0, 0, 0, 0)" && computed !== "rgb(0, 0, 0)") {
      const hex = rgbStringToHex(computed);
      if (hex) return hex;
      return cssColorToHex(computed);
    }
  } finally {
    document.documentElement.removeChild(probe);
  }

  return cssColorToHex(trimmed);
}

function resolveSwatchClassColor(swatchClass: string): string {
  if (typeof document === "undefined") return "";

  const probe = document.createElement("div");
  probe.style.position = "fixed";
  probe.style.visibility = "hidden";
  probe.style.pointerEvents = "none";
  probe.className = swatchClass;
  document.documentElement.appendChild(probe);

  try {
    return getComputedStyle(probe).backgroundColor;
  } finally {
    document.documentElement.removeChild(probe);
  }
}

function readElementBackgroundHex(element: HTMLElement | null): string | null {
  if (!element || typeof document === "undefined") return null;

  const computed = getComputedStyle(element).backgroundColor;
  if (!computed || computed === "rgba(0, 0, 0, 0)" || computed === "rgb(0, 0, 0)") {
    return null;
  }

  return rgbStringToHex(computed);
}

function useColorPickerHex(
  value: string,
  presets: InspectorColorOption[],
  swatchElement: HTMLElement | null,
): string {
  const [hex, setHex] = useState(() => resolveColorPickerHex(value, presets));

  useLayoutEffect(() => {
    const syncHex = () => {
      const fromSwatch = readElementBackgroundHex(swatchElement);
      setHex(fromSwatch ?? resolveColorPickerHex(value, presets));
    };

    syncHex();
    const frame = requestAnimationFrame(syncHex);
    return () => cancelAnimationFrame(frame);
  }, [value, presets, swatchElement]);

  return hex;
}

function hexToRgba(hex: string, alpha = "1"): string {
  const normalized = hex.replace("#", "");
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function resolveColorOption(
  value: string,
  options: InspectorColorOption[],
): InspectorColorOption | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return options.find((option) => option.value === trimmed);
}

function isDirectColorValue(value: string): boolean {
  const trimmed = value.trim();
  return (
    trimmed.startsWith("#") ||
    /^rgba?\(/i.test(trimmed) ||
    /^hsla?\(/i.test(trimmed) ||
    /^oklch\(/i.test(trimmed) ||
    /^lab\(/i.test(trimmed)
  );
}

function usesTokenColorSwatch(
  value: string,
  presets: InspectorColorOption[],
): InspectorColorOption | undefined {
  if (!value.trim() || isDirectColorValue(value)) return undefined;
  return resolveColorOption(value, presets);
}

type InspectorColorListProps = {
  options: InspectorColorOption[];
  value?: string;
  onSelect: (value: string) => void;
};

function InspectorColorList({
  options,
  value,
  onSelect,
}: InspectorColorListProps) {
  return (
    <div className="flex max-h-72 flex-col gap-1 overflow-y-auto p-1">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            className={cn(
              "flex w-full items-center gap-2 rounded-sm px-1.5 py-1 text-xs hover:bg-muted",
              active && "bg-muted",
            )}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onSelect(option.value)}
          >
            <ColorSwatch
              cssVar={option.cssVar}
              swatchClass={option.swatchClass}
            />
            <span className="min-w-0 flex-1 truncate text-left text-muted-foreground">
              {option.label}
            </span>
            {active ? (
              <CheckIcon className="size-3 shrink-0 text-muted-foreground" />
            ) : (
              <span className="size-3 shrink-0" />
            )}
          </button>
        );
      })}
    </div>
  );
}

type InspectorColorInputProps = {
  value: string;
  placeholder?: string;
  presets: InspectorColorOption[];
  onChange: (value: string) => void;
  className?: string;
  id?: string;
  "aria-label"?: string;
};

export function InspectorColorInput({
  value,
  placeholder = "Default",
  presets,
  onChange,
  className,
  id,
  "aria-label": ariaLabel,
}: InspectorColorInputProps) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const selected = resolveColorOption(value, presets);

  return (
    <InspectorAnchorPopover
      open={open}
      onOpenChange={setOpen}
      anchorRef={anchorRef}
      side="top"
      content={
        <InspectorColorList
          options={presets}
          value={value}
          onSelect={(nextValue) => {
            onChange(nextValue);
            setOpen(false);
          }}
        />
      }
    >
      <button
        id={id}
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        className={cn(
          "cn-input flex h-9 w-full min-w-0 shrink-0 items-center gap-2 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none hover:bg-muted/40",
          className,
        )}
        onClick={() => setOpen((current) => !current)}
      >
        {selected ? (
          <>
            <ColorSwatch
              cssVar={selected.cssVar}
              swatchClass={selected.swatchClass}
            />
            <span className="min-w-0 flex-1 truncate text-left text-xs text-muted-foreground">
              {selected.label}
            </span>
          </>
        ) : (
          <>
            <ColorSwatch swatchClass="bg-muted" />
            <span className="min-w-0 flex-1 truncate text-left text-xs text-muted-foreground">
              {placeholder}
            </span>
          </>
        )}
        <CaretDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
      </button>
    </InspectorAnchorPopover>
  );
}

function handleNativeColorChange(
  value: string,
  hex: string,
  onChange: (value: string) => void,
) {
  const alphaMatch = value.match(
    /rgba?\([^,]+,[^,]+,[^,]+,\s*([0-9.]+)\)/,
  );
  const alpha = alphaMatch ? alphaMatch[1]! : "1";
  onChange(alpha === "1" ? hex : hexToRgba(hex, alpha));
}

type InspectorColorFieldProps = {
  value: string;
  placeholder?: string;
  presets: InspectorColorOption[];
  onChange: (value: string) => void;
  className?: string;
  id?: string;
  "aria-label"?: string;
};

export function InspectorColorField({
  value,
  placeholder = "Default",
  presets,
  onChange,
  className,
  id,
  "aria-label": ariaLabel,
}: InspectorColorFieldProps) {
  const [presetOpen, setPresetOpen] = useState(false);
  const presetAnchorRef = useRef<HTMLDivElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const [tokenSwatchNode, setTokenSwatchNode] = useState<HTMLSpanElement | null>(
    null,
  );
  const tokenSwatch = usesTokenColorSwatch(value, presets);
  const hexValue = useColorPickerHex(value, presets, tokenSwatchNode);
  const presetPopoverToggle = useInspectorPresetPopoverToggle(
    presets.length > 0,
    presetOpen,
    setPresetOpen,
  );

  useLayoutEffect(() => {
    if (colorInputRef.current && colorInputRef.current.value !== hexValue) {
      colorInputRef.current.value = hexValue;
    }
  }, [hexValue]);

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <div className="relative size-9 shrink-0">
        {tokenSwatch ? (
          <span
            ref={setTokenSwatchNode}
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-0 overflow-hidden rounded-full",
              tokenSwatch.swatchClass,
            )}
            style={
              tokenSwatch.cssVar
                ? { backgroundColor: `var(${tokenSwatch.cssVar})` }
                : undefined
            }
          />
        ) : null}
        <input
          ref={colorInputRef}
          type="color"
          aria-label={ariaLabel ? `${ariaLabel} picker` : "Color picker"}
          className={cn(
            inspectorNativeColorPickerClass,
            tokenSwatch && "relative z-10 opacity-0",
          )}
          value={hexValue}
          onChange={(event) =>
            handleNativeColorChange(value, event.target.value, onChange)
          }
        />
      </div>

      <InspectorAnchorPopover
        open={presetOpen}
        onOpenChange={setPresetOpen}
        anchorRef={presetAnchorRef}
        content={
          <InspectorColorList
            options={presets}
            value={value}
            onSelect={(nextValue) => {
              onChange(nextValue);
              setPresetOpen(false);
            }}
          />
        }
      >
        <InputGroup className="min-w-0 flex-1">
          <InputGroupInput
            id={id}
            aria-label={ariaLabel}
            value={value}
            placeholder={placeholder}
            aria-expanded={presets.length > 0 ? presetOpen : undefined}
            aria-haspopup={presets.length > 0 ? "dialog" : undefined}
            onChange={(event) => onChange(event.target.value)}
            onPointerDown={presetPopoverToggle.onInputPointerDown}
            onClick={presetPopoverToggle.onInputClick}
          />
        </InputGroup>
      </InspectorAnchorPopover>
    </div>
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
