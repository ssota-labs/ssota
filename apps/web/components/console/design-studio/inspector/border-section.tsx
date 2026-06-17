"use client";

import type { ParsedClassName } from "@/lib/design-studio/tailwind-classname";
import {
  formatBorderWidthPx,
  formatColorToken,
  parseBorderWidthPx,
  stripColorToken,
} from "@/lib/design-studio/tailwind-classname";
import {
  BORDER_THEME_COLOR_OPTIONS,
  BorderStyleDashedIcon,
  BorderStyleDottedIcon,
  BorderStyleDoubleIcon,
  BorderStyleNoneIcon,
  BorderStyleSolidIcon,
  InspectorColorField,
  InspectorField,
  InspectorNumberInput,
  InspectorSection,
  InspectorToggleRow,
  type InspectorPresetOption,
  type InspectorToggleOption,
} from "@ssota/ui/components/design-studio";

const BORDER_STYLE_OPTIONS: InspectorToggleOption[] = [
  {
    value: "border-solid",
    "aria-label": "Solid",
    tooltip: "Solid",
    icon: <BorderStyleSolidIcon />,
  },
  {
    value: "border-dashed",
    "aria-label": "Dashed",
    tooltip: "Dashed",
    icon: <BorderStyleDashedIcon />,
  },
  {
    value: "border-dotted",
    "aria-label": "Dotted",
    tooltip: "Dotted",
    icon: <BorderStyleDottedIcon />,
  },
  {
    value: "border-double",
    "aria-label": "Double",
    tooltip: "Double",
    icon: <BorderStyleDoubleIcon />,
  },
  {
    value: "border-none",
    "aria-label": "None",
    tooltip: "None",
    icon: <BorderStyleNoneIcon />,
  },
];

const BORDER_WIDTH_PRESETS: InspectorPresetOption[] = [
  { value: "0", label: "0" },
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "4", label: "4" },
  { value: "8", label: "8" },
];

type BorderSectionProps = {
  parsed: ParsedClassName;
  onUpdate: (patch: Partial<ParsedClassName>) => void;
};

export function BorderSection({ parsed, onUpdate }: BorderSectionProps) {
  return (
    <InspectorSection title="Border">
      <div className="space-y-3">
        <InspectorField label="Color">
          <InspectorColorField
            aria-label="Border color"
            value={stripColorToken(parsed.borderColor, "border")}
            placeholder="default"
            presets={BORDER_THEME_COLOR_OPTIONS}
            onChange={(input) =>
              onUpdate({
                borderColor: formatColorToken("border", input),
              })
            }
          />
        </InspectorField>

        <InspectorField label="Style">
          <InspectorToggleRow
            value={parsed.borderStyle}
            options={BORDER_STYLE_OPTIONS}
            columns={5}
            onChange={(value) => onUpdate({ borderStyle: value })}
          />
        </InspectorField>

        <InspectorField label="Width">
          <InspectorNumberInput
            aria-label="Border width"
            value={parseBorderWidthPx(parsed.borderWidth)}
            unit="px"
            placeholder="0"
            presets={BORDER_WIDTH_PRESETS}
            onChange={(input) =>
              onUpdate({ borderWidth: formatBorderWidthPx(input) })
            }
          />
        </InspectorField>
      </div>
    </InspectorSection>
  );
}
