"use client";

import type { ParsedClassName } from "@/lib/design-studio/tailwind-classname";
import {
  formatSpacingPx,
  parseSpacingPx,
} from "@/lib/design-studio/tailwind-classname";
import {
  AlignItemsBaselineIcon,
  AlignItemsCenterIcon,
  AlignItemsEndIcon,
  AlignItemsStartIcon,
  AlignItemsStretchIcon,
  FlexDirectionColIcon,
  FlexDirectionColReverseIcon,
  FlexDirectionRowIcon,
  FlexDirectionRowReverseIcon,
  InspectorField,
  InspectorGrid,
  InspectorNumberInput,
  InspectorPopoverPicker,
  InspectorSection,
  InspectorToggleRow,
  JustifyAroundIcon,
  JustifyBetweenIcon,
  JustifyCenterIcon,
  JustifyEndIcon,
  JustifyEvenlyIcon,
  JustifyStartIcon,
  type InspectorPopoverOption,
  type InspectorPresetOption,
  type InspectorToggleOption,
} from "@ssota/ui/components/design-studio";

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

const DIRECTION_OPTIONS: InspectorToggleOption[] = [
  {
    value: "flex-row",
    "aria-label": "Row",
    tooltip: "Row",
    icon: <FlexDirectionRowIcon />,
  },
  {
    value: "flex-col",
    "aria-label": "Column",
    tooltip: "Column",
    icon: <FlexDirectionColIcon />,
  },
  {
    value: "flex-row-reverse",
    "aria-label": "Row reverse",
    tooltip: "Row reverse",
    icon: <FlexDirectionRowReverseIcon />,
  },
  {
    value: "flex-col-reverse",
    "aria-label": "Column reverse",
    tooltip: "Column reverse",
    icon: <FlexDirectionColReverseIcon />,
  },
];

const ALIGN_OPTIONS: InspectorToggleOption[] = [
  {
    value: "items-start",
    "aria-label": "Align start",
    tooltip: "Align start",
    icon: <AlignItemsStartIcon />,
  },
  {
    value: "items-center",
    "aria-label": "Align center",
    tooltip: "Align center",
    icon: <AlignItemsCenterIcon />,
  },
  {
    value: "items-end",
    "aria-label": "Align end",
    tooltip: "Align end",
    icon: <AlignItemsEndIcon />,
  },
  {
    value: "items-stretch",
    "aria-label": "Align stretch",
    tooltip: "Align stretch",
    icon: <AlignItemsStretchIcon />,
  },
  {
    value: "items-baseline",
    "aria-label": "Align baseline",
    tooltip: "Align baseline",
    icon: <AlignItemsBaselineIcon />,
  },
];

const DISTRIBUTE_OPTIONS: InspectorToggleOption[] = [
  {
    value: "justify-start",
    "aria-label": "Distribute start",
    tooltip: "Distribute start",
    icon: <JustifyStartIcon />,
  },
  {
    value: "justify-center",
    "aria-label": "Distribute center",
    tooltip: "Distribute center",
    icon: <JustifyCenterIcon />,
  },
  {
    value: "justify-end",
    "aria-label": "Distribute end",
    tooltip: "Distribute end",
    icon: <JustifyEndIcon />,
  },
  {
    value: "justify-between",
    "aria-label": "Distribute between",
    tooltip: "Distribute between",
    icon: <JustifyBetweenIcon />,
  },
  {
    value: "justify-around",
    "aria-label": "Distribute around",
    tooltip: "Distribute around",
    icon: <JustifyAroundIcon />,
  },
  {
    value: "justify-evenly",
    "aria-label": "Distribute evenly",
    tooltip: "Distribute evenly",
    icon: <JustifyEvenlyIcon />,
  },
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

type LayoutSectionProps = {
  parsed: ParsedClassName;
  onUpdate: (patch: Partial<ParsedClassName>) => void;
};

export function LayoutSection({ parsed, onUpdate }: LayoutSectionProps) {
  const isFlex =
    parsed.display === "flex" || parsed.display === "inline-flex";

  return (
    <InspectorSection title="Layout">
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
              <InspectorToggleRow
                value={parsed.flexDirection}
                options={DIRECTION_OPTIONS}
                columns={4}
                onChange={(value) => onUpdate({ flexDirection: value })}
              />
            </InspectorField>

            <InspectorField label="Align">
              <InspectorToggleRow
                value={parsed.alignItems}
                options={ALIGN_OPTIONS}
                columns={5}
                onChange={(value) => onUpdate({ alignItems: value })}
              />
            </InspectorField>

            <InspectorField label="Distribute">
              <InspectorToggleRow
                value={parsed.justifyContent}
                options={DISTRIBUTE_OPTIONS}
                columns={3}
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
            showPresets={false}
            scrollAdjust
            onChange={(value) => onChange("top", value)}
          />
        </InspectorField>
        <InspectorField label="Bottom">
          <InspectorNumberInput
            aria-label={`${label} bottom`}
            value={parseSpacingPx(bottom)}
            unit="px"
            placeholder="0"
            showPresets={false}
            scrollAdjust
            onChange={(value) => onChange("bottom", value)}
          />
        </InspectorField>
        <InspectorField label="Left">
          <InspectorNumberInput
            aria-label={`${label} left`}
            value={parseSpacingPx(left)}
            unit="px"
            placeholder="0"
            showPresets={false}
            scrollAdjust
            onChange={(value) => onChange("left", value)}
          />
        </InspectorField>
        <InspectorField label="Right">
          <InspectorNumberInput
            aria-label={`${label} right`}
            value={parseSpacingPx(right)}
            unit="px"
            placeholder="0"
            showPresets={false}
            scrollAdjust
            onChange={(value) => onChange("right", value)}
          />
        </InspectorField>
      </InspectorGrid>
    </div>
  );
}
