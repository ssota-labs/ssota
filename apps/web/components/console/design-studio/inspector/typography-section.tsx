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
import { Input } from "@ssota/ui/components/ui/input";
import type { ParsedClassName } from "@/lib/design-studio/tailwind-classname";
import {
  InspectorField,
  InspectorFontFamilyRow,
  InspectorNumberInput,
  InspectorPopoverPicker,
  InspectorSection,
  InspectorToggleRow,
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

const FONT_SIZE_PRESETS: InspectorPresetOption[] = [
  { value: "10", label: "10px" },
  { value: "12", label: "12px" },
  { value: "14", label: "14px" },
  { value: "16", label: "16px" },
  { value: "18", label: "18px" },
  { value: "20", label: "20px" },
  { value: "24", label: "24px" },
];

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

const LINE_HEIGHT_PRESETS: InspectorPresetOption[] = [
  { value: "", label: "normal" },
  { value: "1", label: "1" },
  { value: "1.25", label: "1.25" },
  { value: "1.43", label: "1.43" },
  { value: "1.5", label: "1.5" },
  { value: "2", label: "2" },
];

const LETTER_SPACING_PRESETS: InspectorPresetOption[] = [
  { value: "", label: "normal" },
  { value: "0", label: "0" },
  { value: "0.025", label: "0.025" },
  { value: "0.05", label: "0.05" },
  { value: "0.1", label: "0.1" },
];

type TypographySectionProps = {
  parsed: ParsedClassName;
  onUpdate: (patch: Partial<ParsedClassName>) => void;
};

export function TypographySection({ parsed, onUpdate }: TypographySectionProps) {
  return (
    <InspectorSection title="Typography">
      <div className="space-y-3">
        <InspectorFontFamilyRow
          value={parsed.fontFamily}
          options={FONT_FAMILY_OPTIONS}
          onChange={(value) => onUpdate({ fontFamily: value })}
        />

        <InspectorField label="Size">
          <InspectorNumberInput
            aria-label="Size"
            value={formatFontSizeNumber(parsed.fontSize)}
            unit="px"
            placeholder="Default"
            presets={FONT_SIZE_PRESETS}
            onChange={(input) =>
              onUpdate({ fontSize: parseFontSizeNumber(input) })
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
          <InspectorNumberInput
            aria-label="Line height"
            value={formatLineHeightNumber(parsed.lineHeight)}
            unit="em"
            placeholder="normal"
            presets={LINE_HEIGHT_PRESETS}
            onChange={(input) =>
              onUpdate({ lineHeight: parseLineHeightNumber(input) })
            }
          />
        </InspectorField>

        <InspectorField label="Letter spacing">
          <InspectorNumberInput
            aria-label="Letter spacing"
            value={formatLetterSpacingNumber(parsed.letterSpacing)}
            unit="em"
            placeholder="normal"
            presets={LETTER_SPACING_PRESETS}
            onChange={(input) =>
              onUpdate({ letterSpacing: parseLetterSpacingNumber(input) })
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
          <Input
            aria-label="Color"
            value={parsed.textColor?.replace(/^text-/, "") ?? ""}
            placeholder="foreground"
            onChange={(event) =>
              onUpdate({
                textColor: event.target.value
                  ? `text-${event.target.value}`
                  : undefined,
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

function formatFontSizeNumber(className?: string): string {
  if (!className) return "";
  if (className.startsWith("text-[") && className.endsWith("]")) {
    const inner = className.slice(6, -1);
    const pxMatch = inner.match(/^([\d.]+)px$/);
    if (pxMatch) return pxMatch[1]!;
    const numMatch = inner.match(/^([\d.]+)/);
    return numMatch?.[1] ?? "";
  }
  const map: Record<string, string> = {
    "text-xs": "12",
    "text-sm": "14",
    "text-base": "16",
    "text-lg": "18",
    "text-xl": "20",
    "text-2xl": "24",
    "text-3xl": "30",
  };
  return map[className] ?? "";
}

function parseFontSizeNumber(input: string): string | undefined {
  const trimmed = input.trim();
  if (!trimmed) return undefined;

  const presetMap: Record<string, string> = {
    "10": "text-[10px]",
    "12": "text-xs",
    "14": "text-sm",
    "16": "text-base",
    "18": "text-lg",
    "20": "text-xl",
    "24": "text-2xl",
  };

  if (presetMap[trimmed]) return presetMap[trimmed];
  return `text-[${trimmed}px]`;
}

function formatLineHeightNumber(className?: string): string {
  if (!className || className === "leading-normal") return "";
  if (className.startsWith("leading-[") && className.endsWith("]")) {
    const inner = className.slice(9, -1);
    const emMatch = inner.match(/^([\d.]+)em$/);
    if (emMatch) return emMatch[1]!;
    return inner;
  }
  const named: Record<string, string> = {
    "leading-none": "1",
    "leading-tight": "1.25",
    "leading-snug": "1.375",
    "leading-normal": "",
    "leading-relaxed": "1.625",
    "leading-loose": "2",
  };
  if (named[className] !== undefined) return named[className]!;
  return className.replace(/^leading-/, "");
}

function parseLineHeightNumber(input: string): string | undefined {
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  if (trimmed === "normal") return "leading-normal";
  if (/^\d+(\.\d+)?$/.test(trimmed)) return `leading-[${trimmed}em]`;
  return `leading-${trimmed}`;
}

function formatLetterSpacingNumber(className?: string): string {
  if (!className || className === "tracking-normal") return "";
  if (className.startsWith("tracking-[") && className.endsWith("]")) {
    const inner = className.slice(10, -1);
    const emMatch = inner.match(/^([\d.]+)em$/);
    if (emMatch) return emMatch[1]!;
    return inner;
  }
  const map: Record<string, string> = {
    "tracking-tighter": "0",
    "tracking-tight": "0.025",
    "tracking-normal": "",
    "tracking-wide": "0.025",
    "tracking-wider": "0.05",
    "tracking-widest": "0.1",
  };
  return map[className] ?? className.replace(/^tracking-/, "");
}

function parseLetterSpacingNumber(input: string): string | undefined {
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  if (trimmed === "normal") return "tracking-normal";
  if (/^\d+(\.\d+)?$/.test(trimmed)) return `tracking-[${trimmed}em]`;
  return `tracking-${trimmed}`;
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
