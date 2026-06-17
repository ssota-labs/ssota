"use client";

import { MinusIcon } from "@phosphor-icons/react";
import { Button } from "@ssota/ui/components/ui/button";
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
  applyShadowPreset,
  formatShadowLengthPx,
  parseShadowLengthPx,
} from "@/lib/design-studio/tailwind-classname";
import {
  BACKGROUND_THEME_COLOR_OPTIONS,
  formatInspectorColorAsRgba,
  InspectorColorField,
  InspectorField,
  InspectorGrid,
  InspectorScrubberNumberInput,
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
      <div className="space-y-1.5">
        <span className="block text-xs text-muted-foreground">Shadow</span>
        <div className="flex items-center gap-1.5">
          <div className="min-w-0 flex-1">
            <Select
              value={shadow.preset}
              onValueChange={(value) =>
                onChange(applyShadowPreset(value as ShadowPreset, shadow))
              }
            >
              <SelectTrigger className="w-full" aria-label="Shadow">
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
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="shrink-0"
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
      </div>

      {showDetails ? (
        <>
          <InspectorGrid>
            <InspectorField label="X Offset">
              <InspectorScrubberNumberInput
                aria-label="Shadow X offset"
                value={parseShadowLengthPx(shadow.x)}
                unit="px"
                placeholder="0"
                onChange={(input) =>
                  onChange({
                    ...shadow,
                    preset: "custom",
                    x: formatShadowLengthPx(input),
                  })
                }
              />
            </InspectorField>
            <InspectorField label="Y Offset">
              <InspectorScrubberNumberInput
                aria-label="Shadow Y offset"
                value={parseShadowLengthPx(shadow.y)}
                unit="px"
                placeholder="0"
                onChange={(input) =>
                  onChange({
                    ...shadow,
                    preset: "custom",
                    y: formatShadowLengthPx(input),
                  })
                }
              />
            </InspectorField>
            <InspectorField label="Blur">
              <InspectorScrubberNumberInput
                aria-label="Shadow blur"
                value={parseShadowLengthPx(shadow.blur)}
                unit="px"
                placeholder="0"
                min={0}
                onChange={(input) =>
                  onChange({
                    ...shadow,
                    preset: "custom",
                    blur: formatShadowLengthPx(input),
                  })
                }
              />
            </InspectorField>
            <InspectorField label="Spread">
              <InspectorScrubberNumberInput
                aria-label="Shadow spread"
                value={parseShadowLengthPx(shadow.spread)}
                unit="px"
                placeholder="0"
                onChange={(input) =>
                  onChange({
                    ...shadow,
                    preset: "custom",
                    spread: formatShadowLengthPx(input),
                  })
                }
              />
            </InspectorField>
          </InspectorGrid>

          <InspectorField label="Color">
            <InspectorColorField
              aria-label="Shadow color"
              value={shadow.color}
              placeholder="rgba(0, 0, 0, 0.1)"
              presets={BACKGROUND_THEME_COLOR_OPTIONS}
              onChange={(color) =>
                onChange({
                  ...shadow,
                  preset: "custom",
                  color: formatInspectorColorAsRgba(
                    color,
                    BACKGROUND_THEME_COLOR_OPTIONS,
                    shadow.color,
                  ),
                })
              }
            />
          </InspectorField>

          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Inset</p>
              <p className="text-[10px] text-muted-foreground">Inner shadow</p>
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
