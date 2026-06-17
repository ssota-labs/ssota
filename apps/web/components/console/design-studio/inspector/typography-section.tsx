"use client";

import {
  ArrowsHorizontalIcon,
  ArrowsVerticalIcon,
  CodeIcon,
  HashIcon,
  MinusIcon,
  SlidersHorizontalIcon,
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
  InspectorSection,
} from "./inspector-section";
import {
  InspectorFontFamilyRow,
  InspectorPopoverPicker,
  InspectorToggleRow,
  InspectorTokenInput,
  type InspectorPopoverOption,
} from "./inspector-controls";

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

const FONT_SIZE_OPTIONS: InspectorPopoverOption[] = [
  { value: "12px", label: "12px", icon: <HashIcon className="size-3.5" /> },
  { value: "14px", label: "14px", icon: <HashIcon className="size-3.5" /> },
  { value: "16px", label: "16px", icon: <HashIcon className="size-3.5" /> },
  { value: "18px", label: "18px", icon: <HashIcon className="size-3.5" /> },
  { value: "20px", label: "20px", icon: <HashIcon className="size-3.5" /> },
  { value: "24px", label: "24px", icon: <HashIcon className="size-3.5" /> },
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

const LINE_HEIGHT_OPTIONS: InspectorPopoverOption[] = [
  {
    value: "normal",
    label: "normal",
    icon: <ArrowsVerticalIcon className="size-3.5" />,
  },
  { value: "1", label: "1", icon: <ArrowsVerticalIcon className="size-3.5" /> },
  {
    value: "1.25",
    label: "1.25",
    icon: <ArrowsVerticalIcon className="size-3.5" />,
  },
  {
    value: "1.43",
    label: "1.43",
    icon: <ArrowsVerticalIcon className="size-3.5" />,
  },
  {
    value: "1.5",
    label: "1.5",
    icon: <ArrowsVerticalIcon className="size-3.5" />,
  },
  { value: "2", label: "2", icon: <ArrowsVerticalIcon className="size-3.5" /> },
];

const LETTER_SPACING_OPTIONS: InspectorPopoverOption[] = [
  {
    value: "normal",
    label: "normal",
    icon: <ArrowsHorizontalIcon className="size-3.5" />,
  },
  { value: "0", label: "0em", icon: <ArrowsHorizontalIcon className="size-3.5" /> },
  {
    value: "0.025",
    label: "0.025em",
    icon: <ArrowsHorizontalIcon className="size-3.5" />,
  },
  {
    value: "0.05",
    label: "0.05em",
    icon: <ArrowsHorizontalIcon className="size-3.5" />,
  },
  {
    value: "0.1",
    label: "0.1em",
    icon: <ArrowsHorizontalIcon className="size-3.5" />,
  },
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
          <InspectorTokenInput
            aria-label="Size"
            value={formatFontSizeDisplay(parsed.fontSize)}
            placeholder="Default"
            options={FONT_SIZE_OPTIONS}
            onChange={(input) =>
              onUpdate({ fontSize: parseFontSizeInput(input) })
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
          <InspectorTokenInput
            aria-label="Line height"
            value={formatLineHeightDisplay(parsed.lineHeight)}
            placeholder="normal"
            options={LINE_HEIGHT_OPTIONS}
            onChange={(input) =>
              onUpdate({ lineHeight: parseLineHeightInput(input) })
            }
          />
        </InspectorField>

        <InspectorField label="Letter spacing">
          <InspectorTokenInput
            aria-label="Letter spacing"
            value={formatLetterSpacingDisplay(parsed.letterSpacing)}
            placeholder="normal"
            options={LETTER_SPACING_OPTIONS}
            onChange={(input) =>
              onUpdate({ letterSpacing: parseLetterSpacingInput(input) })
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
                icon: <TextAlignLeftIcon className="size-3.5" />,
              },
              {
                value: "center",
                "aria-label": "Align center",
                icon: <TextAlignCenterIcon className="size-3.5" />,
              },
              {
                value: "right",
                "aria-label": "Align right",
                icon: <TextAlignRightIcon className="size-3.5" />,
              },
              {
                value: "justify",
                "aria-label": "Justify",
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
              },
              {
                value: "capitalize",
                label: "Aa",
                "aria-label": "Capitalize",
              },
              {
                value: "uppercase",
                label: "AA",
                "aria-label": "Uppercase",
              },
              {
                value: "lowercase",
                label: "aa",
                "aria-label": "Lowercase",
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
                icon: <MinusIcon className="size-3.5" />,
              },
              {
                value: "underline",
                "aria-label": "Underline",
                icon: <TextUnderlineIcon className="size-3.5" />,
              },
              {
                value: "line-through",
                "aria-label": "Strikethrough",
                icon: <TextStrikethroughIcon className="size-3.5" />,
              },
              {
                value: "overline",
                "aria-label": "Overline",
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

function formatFontSizeDisplay(className?: string): string {
  if (!className) return "";
  if (className.startsWith("text-[") && className.endsWith("]")) {
    return className.slice(6, -1);
  }
  const map: Record<string, string> = {
    "text-xs": "12px",
    "text-sm": "14px",
    "text-base": "16px",
    "text-lg": "18px",
    "text-xl": "20px",
    "text-2xl": "24px",
    "text-3xl": "30px",
  };
  return map[className] ?? className.replace(/^text-/, "");
}

function parseFontSizeInput(input: string): string | undefined {
  const trimmed = input.trim();
  if (!trimmed) return undefined;

  const presetByLabel = Object.fromEntries(
    FONT_SIZE_OPTIONS.map((option) => {
      const tailwindMap: Record<string, string> = {
        "12px": "text-xs",
        "14px": "text-sm",
        "16px": "text-base",
        "18px": "text-lg",
        "20px": "text-xl",
        "24px": "text-2xl",
      };
      return [option.label, tailwindMap[option.label] ?? `text-[${option.label}]`];
    }),
  );

  if (presetByLabel[trimmed]) return presetByLabel[trimmed];
  if (trimmed.startsWith("text-")) return trimmed;
  if (/^\d+(\.\d+)?$/.test(trimmed)) return `text-[${trimmed}px]`;
  if (trimmed.includes("px") || trimmed.includes("rem") || trimmed.includes("em")) {
    return `text-[${trimmed}]`;
  }
  return `text-${trimmed}`;
}

function formatLineHeightDisplay(className?: string): string {
  if (!className) return "";
  if (className.startsWith("leading-[") && className.endsWith("]")) {
    return className.slice(9, -1);
  }
  return className.replace(/^leading-/, "");
}

function parseLineHeightInput(input: string): string | undefined {
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith("leading-")) return trimmed;
  if (trimmed === "normal") return "leading-normal";
  if (/^\d+(\.\d+)?$/.test(trimmed)) return `leading-[${trimmed}]`;
  return `leading-${trimmed}`;
}

function formatLetterSpacingDisplay(className?: string): string {
  if (!className) return "";
  if (className.startsWith("tracking-[") && className.endsWith("]")) {
    const inner = className.slice(10, -1);
    return inner.endsWith("em") ? inner : `${inner}em`;
  }
  const map: Record<string, string> = {
    "tracking-tighter": "0",
    "tracking-tight": "0.025em",
    "tracking-normal": "normal",
    "tracking-wide": "0.025em",
    "tracking-wider": "0.05em",
    "tracking-widest": "0.1em",
  };
  if (map[className]) return map[className];
  return className.replace(/^tracking-/, "");
}

function parseLetterSpacingInput(input: string): string | undefined {
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith("tracking-")) return trimmed;
  if (trimmed === "normal") return "tracking-normal";
  if (trimmed === "0" || trimmed === "0em") return "tracking-tighter";
  if (trimmed.endsWith("em")) {
    const numeric = trimmed.slice(0, -2);
    return `tracking-[${numeric}em]`;
  }
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
