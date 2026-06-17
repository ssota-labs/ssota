"use client";

import { MinusIcon } from "@phosphor-icons/react";
import { Button } from "@ssota/ui/components/ui/button";
import { Input } from "@ssota/ui/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ssota/ui/components/ui/select";
import { Switch } from "@ssota/ui/components/ui/switch";
import type { ShadowPreset, ShadowValue } from "@/lib/design-studio/tailwind-classname";
import {
  InspectorField,
  InspectorGrid,
  InspectorSection,
} from "@ssota/ui/components/design-studio";

const SHADOW_PRESET_OPTIONS: Array<{ value: ShadowPreset; label: string }> = [
  { value: "none", label: "None" },
  { value: "sm", label: "Small" },
  { value: "default", label: "Default" },
  { value: "md", label: "Medium" },
  { value: "lg", label: "Large" },
  { value: "xl", label: "XL" },
  { value: "2xl", label: "2XL" },
  { value: "custom", label: "Custom" },
];

type ShadowSectionProps = {
  shadow: ShadowValue;
  onChange: (shadow: ShadowValue) => void;
};

export function ShadowSection({ shadow, onChange }: ShadowSectionProps) {
  const showDetails = shadow.preset !== "none";

  return (
    <InspectorSection title="Shadow">
      <div className="flex items-end gap-2">
        <InspectorField label="Shadow" className="min-w-0 flex-1">
          <Select
            value={shadow.preset}
            onValueChange={(value) =>
              onChange({
                ...shadow,
                preset: value as ShadowPreset,
              })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SHADOW_PRESET_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </InspectorField>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Remove shadow"
          onClick={() =>
            onChange({
              ...shadow,
              preset: "none",
              inset: false,
            })
          }
        >
          <MinusIcon className="size-3.5" />
        </Button>
      </div>

      {showDetails ? (
        <>
          <InspectorGrid>
            <InspectorField label="X Offset">
              <Input
                value={shadow.x}
                onChange={(event) =>
                  onChange({ ...shadow, preset: "custom", x: event.target.value })
                }
              />
            </InspectorField>
            <InspectorField label="Y Offset">
              <Input
                value={shadow.y}
                onChange={(event) =>
                  onChange({ ...shadow, preset: "custom", y: event.target.value })
                }
              />
            </InspectorField>
            <InspectorField label="Blur">
              <Input
                value={shadow.blur}
                onChange={(event) =>
                  onChange({
                    ...shadow,
                    preset: "custom",
                    blur: event.target.value,
                  })
                }
              />
            </InspectorField>
            <InspectorField label="Spread">
              <Input
                value={shadow.spread}
                onChange={(event) =>
                  onChange({
                    ...shadow,
                    preset: "custom",
                    spread: event.target.value,
                  })
                }
              />
            </InspectorField>
          </InspectorGrid>

          <InspectorField label="Color">
            <div className="flex items-center gap-2">
              <input
                type="color"
                aria-label="Shadow color"
                className="size-8 shrink-0 cursor-pointer rounded-md border bg-transparent p-0.5"
                value={toHexColor(shadow.color)}
                onChange={(event) =>
                  onChange({
                    ...shadow,
                    preset: "custom",
                    color: hexToRgba(event.target.value, shadow.color),
                  })
                }
              />
              <Input
                value={shadow.color}
                onChange={(event) =>
                  onChange({
                    ...shadow,
                    preset: "custom",
                    color: event.target.value,
                  })
                }
              />
            </div>
          </InspectorField>

          <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
            <div>
              <p className="text-sm">Inset</p>
              <p className="text-xs text-muted-foreground">Inner shadow</p>
            </div>
            <Switch
              checked={shadow.inset}
              onCheckedChange={(checked) =>
                onChange({
                  ...shadow,
                  preset: shadow.preset === "none" ? "custom" : shadow.preset,
                  inset: checked,
                })
              }
            />
          </div>
        </>
      ) : null}
    </InspectorSection>
  );
}

function toHexColor(color: string): string {
  if (color.startsWith("#")) {
    return color.length === 4
      ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
      : color.slice(0, 7);
  }

  const rgba = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!rgba) return "#000000";
  const r = Number(rgba[1]).toString(16).padStart(2, "0");
  const g = Number(rgba[2]).toString(16).padStart(2, "0");
  const b = Number(rgba[3]).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`;
}

function hexToRgba(hex: string, previous: string): string {
  const alphaMatch = previous.match(/rgba?\([^,]+,[^,]+,[^,]+,\s*([0-9.]+)\)/);
  const alpha = alphaMatch ? alphaMatch[1] : "0.1";
  const normalized = hex.replace("#", "");
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
