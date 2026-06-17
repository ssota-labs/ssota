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
  InspectorColorField,
  InspectorField,
  InspectorPresetNumberInput,
  InspectorPopoverPicker,
  InspectorSection,
  type InspectorPopoverOption,
  type InspectorPresetOption,
} from "@ssota/ui/components/design-studio";

const BORDER_STYLE_OPTIONS: InspectorPopoverOption[] = [
  { value: "border-solid", label: "solid" },
  { value: "border-dashed", label: "dashed" },
  { value: "border-dotted", label: "dotted" },
  { value: "border-double", label: "double" },
  { value: "border-none", label: "none" },
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
          <InspectorPopoverPicker
            aria-label="Border style"
            value={parsed.borderStyle}
            placeholder="Default"
            options={BORDER_STYLE_OPTIONS}
            onChange={(value) => onUpdate({ borderStyle: value })}
          />
        </InspectorField>

        <InspectorField label="Width">
          <InspectorPresetNumberInput
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
