"use client";

import { useState } from "react";
import type { ParsedClassName } from "@/lib/design-studio/tailwind-classname";
import {
  formatSpacingPx,
  parseSpacingPx,
} from "@/lib/design-studio/tailwind-classname";
import {
  InspectorField,
  InspectorGrid,
  InspectorNumberInput,
  InspectorPopoverPicker,
  InspectorSection,
  type InspectorPopoverOption,
  type InspectorPresetOption,
} from "@ssota/ui/components/design-studio";
import { Checkbox } from "@ssota/ui/components/ui/checkbox";
import { Label } from "@ssota/ui/components/ui/label";

const DISPLAY_OPTIONS: InspectorPopoverOption[] = [
  { value: "block", label: "block" },
  { value: "inline-block", label: "inline-block" },
  { value: "inline", label: "inline" },
  { value: "flex", label: "flex" },
  { value: "inline-flex", label: "inline-flex" },
  { value: "grid", label: "grid" },
  { value: "inline-grid", label: "inline-grid" },
  { value: "hidden", label: "hidden" },
];

const DIRECTION_OPTIONS: InspectorPopoverOption[] = [
  { value: "flex-row", label: "row" },
  { value: "flex-col", label: "column" },
  { value: "flex-row-reverse", label: "row reverse" },
  { value: "flex-col-reverse", label: "column reverse" },
];

const ALIGN_OPTIONS: InspectorPopoverOption[] = [
  { value: "items-start", label: "start" },
  { value: "items-center", label: "center" },
  { value: "items-end", label: "end" },
  { value: "items-stretch", label: "stretch" },
  { value: "items-baseline", label: "baseline" },
];

const DISTRIBUTE_OPTIONS: InspectorPopoverOption[] = [
  { value: "justify-start", label: "start" },
  { value: "justify-center", label: "center" },
  { value: "justify-end", label: "end" },
  { value: "justify-between", label: "between" },
  { value: "justify-around", label: "around" },
  { value: "justify-evenly", label: "evenly" },
];

const GAP_PRESETS: InspectorPresetOption[] = [
  { value: "0", label: "0" },
  { value: "4", label: "4" },
  { value: "8", label: "8" },
  { value: "12", label: "12" },
  { value: "16", label: "16" },
  { value: "24", label: "24" },
  { value: "32", label: "32" },
];

const SPACING_PRESETS: InspectorPresetOption[] = [
  { value: "0", label: "0" },
  { value: "4", label: "4" },
  { value: "8", label: "8" },
  { value: "16", label: "16" },
  { value: "24", label: "24" },
  { value: "32", label: "32" },
];

type LayoutSectionProps = {
  parsed: ParsedClassName;
  onUpdate: (patch: Partial<ParsedClassName>) => void;
};

export function LayoutSection({ parsed, onUpdate }: LayoutSectionProps) {
  const [showSpacing, setShowSpacing] = useState(true);
  const isFlex =
    parsed.display === "flex" || parsed.display === "inline-flex";

  return (
    <InspectorSection
      title="Layout"
      headerAction={
        <div className="flex items-center gap-1.5">
          <Checkbox
            id="layout-show-spacing"
            checked={showSpacing}
            onCheckedChange={(checked) => setShowSpacing(checked === true)}
          />
          <Label
            htmlFor="layout-show-spacing"
            className="cursor-pointer text-[11px] font-normal text-muted-foreground"
          >
            Show paddings and margins
          </Label>
        </div>
      }
    >
      <div className="space-y-3">
        <InspectorField label="Display">
          <InspectorPopoverPicker
            aria-label="Display"
            value={parsed.display}
            placeholder="Default"
            options={DISPLAY_OPTIONS}
            onChange={(value) => onUpdate({ display: value })}
          />
        </InspectorField>

        {isFlex ? (
          <>
            <InspectorField label="Direction">
              <InspectorPopoverPicker
                aria-label="Direction"
                value={parsed.flexDirection}
                placeholder="Default"
                options={DIRECTION_OPTIONS}
                onChange={(value) => onUpdate({ flexDirection: value })}
              />
            </InspectorField>

            <InspectorField label="Align">
              <InspectorPopoverPicker
                aria-label="Align"
                value={parsed.alignItems}
                placeholder="Default"
                options={ALIGN_OPTIONS}
                onChange={(value) => onUpdate({ alignItems: value })}
              />
            </InspectorField>

            <InspectorField label="Distribute">
              <InspectorPopoverPicker
                aria-label="Distribute"
                value={parsed.justifyContent}
                placeholder="Default"
                options={DISTRIBUTE_OPTIONS}
                onChange={(value) => onUpdate({ justifyContent: value })}
              />
            </InspectorField>
          </>
        ) : null}

        <InspectorField label="Gap">
          <InspectorNumberInput
            aria-label="Gap"
            value={parseSpacingPx(parsed.gap)}
            unit="px"
            placeholder="0"
            presets={GAP_PRESETS}
            onChange={(input) =>
              onUpdate({ gap: formatSpacingPx("gap", input) })
            }
          />
        </InspectorField>

        {showSpacing ? (
          <>
            <SpacingQuadGroup
              label="Margin"
              top={parsed.marginTop}
              right={parsed.marginRight}
              bottom={parsed.marginBottom}
              left={parsed.marginLeft}
              onChange={(side, value) => {
                const patch: Partial<ParsedClassName> = {};
                if (side === "top") patch.marginTop = formatSpacingPx("mt", value);
                if (side === "right") {
                  patch.marginRight = formatSpacingPx("mr", value);
                }
                if (side === "bottom") {
                  patch.marginBottom = formatSpacingPx("mb", value);
                }
                if (side === "left") patch.marginLeft = formatSpacingPx("ml", value);
                onUpdate(patch);
              }}
            />

            <SpacingQuadGroup
              label="Padding"
              top={parsed.paddingTop}
              right={parsed.paddingRight}
              bottom={parsed.paddingBottom}
              left={parsed.paddingLeft}
              onChange={(side, value) => {
                const patch: Partial<ParsedClassName> = {};
                if (side === "top") patch.paddingTop = formatSpacingPx("pt", value);
                if (side === "right") {
                  patch.paddingRight = formatSpacingPx("pr", value);
                }
                if (side === "bottom") {
                  patch.paddingBottom = formatSpacingPx("pb", value);
                }
                if (side === "left") patch.paddingLeft = formatSpacingPx("pl", value);
                onUpdate(patch);
              }}
            />
          </>
        ) : null}
      </div>
    </InspectorSection>
  );
}

type SpacingSide = "top" | "right" | "bottom" | "left";

type SpacingQuadGroupProps = {
  label: string;
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  onChange: (side: SpacingSide, value: string) => void;
};

function SpacingQuadGroup({
  label,
  top,
  right,
  bottom,
  left,
  onChange,
}: SpacingQuadGroupProps) {
  return (
    <div className="space-y-1.5">
      <span className="block text-xs text-muted-foreground">{label}</span>
      <InspectorGrid>
        <InspectorField label="Top">
          <InspectorNumberInput
            aria-label={`${label} top`}
            value={parseSpacingPx(top)}
            unit="px"
            placeholder="0"
            presets={SPACING_PRESETS}
            onChange={(value) => onChange("top", value)}
          />
        </InspectorField>
        <InspectorField label="Bottom">
          <InspectorNumberInput
            aria-label={`${label} bottom`}
            value={parseSpacingPx(bottom)}
            unit="px"
            placeholder="0"
            presets={SPACING_PRESETS}
            onChange={(value) => onChange("bottom", value)}
          />
        </InspectorField>
        <InspectorField label="Left">
          <InspectorNumberInput
            aria-label={`${label} left`}
            value={parseSpacingPx(left)}
            unit="px"
            placeholder="0"
            presets={SPACING_PRESETS}
            onChange={(value) => onChange("left", value)}
          />
        </InspectorField>
        <InspectorField label="Right">
          <InspectorNumberInput
            aria-label={`${label} right`}
            value={parseSpacingPx(right)}
            unit="px"
            placeholder="0"
            presets={SPACING_PRESETS}
            onChange={(value) => onChange("right", value)}
          />
        </InspectorField>
      </InspectorGrid>
    </div>
  );
}
