"use client";

import {
  CodeIcon,
  MinusIcon,
  TextAaIcon,
  TextAlignCenterIcon,
  TextAlignJustifyIcon,
  TextAlignLeftIcon,
  TextAlignRightIcon,
  TextBIcon,
  TextItalicIcon,
  TextStrikethroughIcon,
  TextTIcon,
  TextUnderlineIcon,
} from "@phosphor-icons/react";
import type { ParsedClassName } from "@/lib/design-studio/tailwind-classname";
import {
  formatFontSizeClass,
  formatFontSizeOnUnitChange,
  formatLetterSpacingClass,
  formatLetterSpacingOnUnitChange,
  formatLineHeightClass,
  formatLineHeightOnUnitChange,
  parseFontSizeValue,
  parseLetterSpacingValue,
  parseLineHeightValue,
  resolveFontSizePxFromClass,
} from "@/lib/design-studio/tailwind-classname";
import {
  InspectorColorField,
  InspectorField,
  InspectorFontFamilyRow,
  InspectorPresetNumberInput,
  InspectorPopoverPicker,
  InspectorScrubberNumberInput,
  InspectorSection,
  InspectorToggleRow,
  TEXT_THEME_COLOR_OPTIONS,
  type InspectorNumberUnit,
  type InspectorPopoverOption,
  type InspectorPresetOption,
} from "@ssota/ui/components/design-studio";

const FONT_FAMILY_OPTIONS: InspectorPopoverOption[] = [
  { value: "font-sans", label: "Inter", icon: <TextTIcon className="size-3.5" /> },
  {
    value: "font-serif",
    label: "Serif",
    icon: <TextAaIcon className="size-3.5" />,
  },
  {
    value: "font-mono",
    label: "Mono",
    icon: <CodeIcon className="size-3.5" />,
  },
];

const FONT_SIZE_UNITS = ["px", "%", "em"] as const satisfies readonly InspectorNumberUnit[];

const FONT_WEIGHT_OPTIONS: InspectorPopoverOption[] = [
  {
    value: "font-normal",
    label: "Regular",
    icon: <TextBIcon className="size-3.5" />,
  },
  {
    value: "font-medium",
    label: "Medium",
    icon: <TextBIcon className="size-3.5" weight="bold" />,
  },
  {
    value: "font-semibold",
    label: "Semibold",
    icon: <TextBIcon className="size-3.5" weight="bold" />,
  },
  {
    value: "font-bold",
    label: "Bold",
    icon: <TextBIcon className="size-3.5" weight="fill" />,
  },
];

const TYPOGRAPHY_UNITS = ["px", "%", "em"] as const satisfies readonly InspectorNumberUnit[];

const LINE_HEIGHT_PRESETS_BY_UNIT: Record<
  InspectorNumberUnit,
  InspectorPresetOption[]
> = {
  px: [
    { value: "", label: "normal" },
    { value: "12", label: "12" },
    { value: "16", label: "16" },
    { value: "20", label: "20" },
    { value: "24", label: "24" },
    { value: "32", label: "32" },
  ],
  "%": [
    { value: "", label: "normal" },
    { value: "100", label: "100" },
    { value: "120", label: "120" },
    { value: "150", label: "150" },
    { value: "200", label: "200" },
  ],
  em: [
    { value: "", label: "normal" },
    { value: "1", label: "1" },
    { value: "1.25", label: "1.25" },
    { value: "1.43", label: "1.43" },
    { value: "1.5", label: "1.5" },
    { value: "2", label: "2" },
  ],
};

const LETTER_SPACING_PRESETS_BY_UNIT: Record<
  InspectorNumberUnit,
  InspectorPresetOption[]
> = {
  px: [
    { value: "", label: "normal" },
    { value: "0", label: "0" },
    { value: "1", label: "1" },
    { value: "2", label: "2" },
    { value: "4", label: "4" },
  ],
  "%": [
    { value: "", label: "normal" },
    { value: "0", label: "0" },
    { value: "2.5", label: "2.5" },
    { value: "5", label: "5" },
    { value: "10", label: "10" },
  ],
  em: [
    { value: "", label: "normal" },
    { value: "0", label: "0" },
    { value: "0.025", label: "0.025" },
    { value: "0.05", label: "0.05" },
    { value: "0.1", label: "0.1" },
  ],
};

type TypographySectionProps = {
  parsed: ParsedClassName;
  onUpdate: (patch: Partial<ParsedClassName>) => void;
};

export function TypographySection({ parsed, onUpdate }: TypographySectionProps) {
  const fontSize = parseFontSizeValue(parsed.fontSize);
  const fontSizePx = resolveFontSizePxFromClass(parsed.fontSize);
  const lineHeight = parseLineHeightValue(parsed.lineHeight);
  const letterSpacing = parseLetterSpacingValue(parsed.letterSpacing);

  return (
    <InspectorSection title="Typography">
      <div className="space-y-3">
        <InspectorFontFamilyRow
          value={parsed.fontFamily}
          options={FONT_FAMILY_OPTIONS}
          onChange={(value) => onUpdate({ fontFamily: value })}
        />

        <InspectorField label="Size">
          <InspectorScrubberNumberInput
            aria-label="Size"
            value={fontSize.value}
            unit={fontSize.unit}
            units={FONT_SIZE_UNITS}
            placeholder="Default"
            onUnitChange={(nextUnit) =>
              onUpdate({
                fontSize: formatFontSizeOnUnitChange(
                  fontSize.value,
                  fontSize.unit,
                  nextUnit,
                ),
              })
            }
            onChange={(input) =>
              onUpdate({
                fontSize: formatFontSizeClass(input, fontSize.unit),
              })
            }
          />
        </InspectorField>

        <InspectorField label="Weight">
          <InspectorPopoverPicker
            aria-label="Weight"
            value={parsed.fontWeight}
            placeholder="Default"
            options={FONT_WEIGHT_OPTIONS}
            onChange={(value) => onUpdate({ fontWeight: value })}
          />
        </InspectorField>

        <InspectorField label="Style">
          <InspectorToggleRow
            value={parsed.fontStyle === "italic" ? "italic" : "normal"}
            options={[
              {
                value: "normal",
                "aria-label": "Normal",
                icon: <TextTIcon className="size-3.5" />,
              },
              {
                value: "italic",
                "aria-label": "Italic",
                icon: <TextItalicIcon className="size-3.5" />,
              },
            ]}
            columns={2}
            onChange={(value) =>
              onUpdate({
                fontStyle: value === "italic" ? "italic" : undefined,
              })
            }
          />
        </InspectorField>

        <InspectorField label="Line height">
          <InspectorPresetNumberInput
            aria-label="Line height"
            value={lineHeight.value}
            unit={lineHeight.unit}
            units={TYPOGRAPHY_UNITS}
            presetsByUnit={LINE_HEIGHT_PRESETS_BY_UNIT}
            placeholder="normal"
            onUnitChange={(nextUnit) =>
              onUpdate({
                lineHeight: formatLineHeightOnUnitChange(
                  lineHeight.value,
                  lineHeight.unit,
                  nextUnit,
                  fontSizePx,
                ),
              })
            }
            onChange={(input) =>
              onUpdate({
                lineHeight: formatLineHeightClass(input, lineHeight.unit),
              })
            }
          />
        </InspectorField>

        <InspectorField label="Letter spacing">
          <InspectorPresetNumberInput
            aria-label="Letter spacing"
            value={letterSpacing.value}
            unit={letterSpacing.unit}
            units={TYPOGRAPHY_UNITS}
            presetsByUnit={LETTER_SPACING_PRESETS_BY_UNIT}
            placeholder="normal"
            onUnitChange={(nextUnit) =>
              onUpdate({
                letterSpacing: formatLetterSpacingOnUnitChange(
                  letterSpacing.value,
                  letterSpacing.unit,
                  nextUnit,
                  fontSizePx,
                ),
              })
            }
            onChange={(input) =>
              onUpdate({
                letterSpacing: formatLetterSpacingClass(
                  input,
                  letterSpacing.unit,
                ),
              })
            }
          />
        </InspectorField>

        <InspectorField label="Alignment">
          <InspectorToggleRow
            value={parsed.textAlign?.replace(/^text-/, "")}
            options={[
              {
                value: "left",
                "aria-label": "Align left",
                tooltip: "Align left",
                icon: <TextAlignLeftIcon className="size-3.5" />,
              },
              {
                value: "center",
                "aria-label": "Align center",
                tooltip: "Align center",
                icon: <TextAlignCenterIcon className="size-3.5" />,
              },
              {
                value: "right",
                "aria-label": "Align right",
                tooltip: "Align right",
                icon: <TextAlignRightIcon className="size-3.5" />,
              },
              {
                value: "justify",
                "aria-label": "Justify",
                tooltip: "Justify",
                icon: <TextAlignJustifyIcon className="size-3.5" />,
              },
            ]}
            columns={4}
            onChange={(value) =>
              onUpdate({
                textAlign: value ? `text-${value}` : undefined,
              })
            }
          />
        </InspectorField>

        <InspectorField label="Case">
          <InspectorToggleRow
            value={textTransformToToggleValue(parsed.textTransform)}
            options={[
              {
                value: "none",
                label: "—",
                "aria-label": "No case transform",
                tooltip: "None",
              },
              {
                value: "capitalize",
                label: "Aa",
                "aria-label": "Capitalize",
                tooltip: "Capitalize",
              },
              {
                value: "uppercase",
                label: "AA",
                "aria-label": "Uppercase",
                tooltip: "Uppercase",
              },
              {
                value: "lowercase",
                label: "aa",
                "aria-label": "Lowercase",
                tooltip: "Lowercase",
              },
            ]}
            columns={4}
            onChange={(value) =>
              onUpdate({
                textTransform:
                  value && value !== "none"
                    ? value === "capitalize"
                      ? "capitalize"
                      : value === "uppercase"
                        ? "uppercase"
                        : "lowercase"
                    : undefined,
              })
            }
          />
        </InspectorField>

        <InspectorField label="Decoration">
          <InspectorToggleRow
            value={textDecorationToToggleValue(parsed.textDecoration)}
            options={[
              {
                value: "none",
                "aria-label": "No decoration",
                tooltip: "None",
                icon: <MinusIcon className="size-3.5" />,
              },
              {
                value: "underline",
                "aria-label": "Underline",
                tooltip: "Underline",
                icon: <TextUnderlineIcon className="size-3.5" />,
              },
              {
                value: "line-through",
                "aria-label": "Strikethrough",
                tooltip: "Strikethrough",
                icon: <TextStrikethroughIcon className="size-3.5" />,
              },
              {
                value: "overline",
                "aria-label": "Overline",
                tooltip: "Overline",
                icon: <OverlineIcon />,
              },
            ]}
            columns={4}
            onChange={(value) =>
              onUpdate({
                textDecoration:
                  value && value !== "none" ? value : undefined,
              })
            }
          />
        </InspectorField>

        <InspectorField label="Color">
          <InspectorColorField
            aria-label="Color"
            value={parsed.textColor?.replace(/^text-/, "") ?? ""}
            placeholder="foreground"
            presets={TEXT_THEME_COLOR_OPTIONS}
            onChange={(input) =>
              onUpdate({
                textColor: input ? `text-${input}` : undefined,
              })
            }
          />
        </InspectorField>
      </div>
    </InspectorSection>
  );
}

function OverlineIcon() {
  return (
    <span className="relative flex size-3.5 items-center justify-center text-[10px] font-medium leading-none">
      n
      <span className="absolute top-0 left-0 h-px w-full bg-current" />
    </span>
  );
}

function textTransformToToggleValue(textTransform?: string): string | undefined {
  if (!textTransform || textTransform === "normal-case") return "none";
  if (textTransform === "capitalize") return "capitalize";
  if (textTransform === "uppercase") return "uppercase";
  if (textTransform === "lowercase") return "lowercase";
  return undefined;
}

function textDecorationToToggleValue(
  textDecoration?: string,
): string | undefined {
  if (!textDecoration || textDecoration === "no-underline") return "none";
  return textDecoration;
}
