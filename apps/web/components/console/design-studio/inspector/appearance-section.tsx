"use client";

import { useState } from "react";
import { SquaresFourIcon } from "@phosphor-icons/react";
import type { ParsedClassName } from "@/lib/design-studio/tailwind-classname";
import {
  formatOpacityPercent,
  formatRadiusPx,
  parseOpacityPercent,
  parseRadiusPx,
} from "@/lib/design-studio/tailwind-classname";
import {
  InspectorField,
  InspectorGrid,
  InspectorNumberInput,
  InspectorSection,
  type InspectorPresetOption,
} from "@ssota/ui/components/design-studio";
import { Button } from "@ssota/ui/components/ui/button";
import { cn } from "@ssota/ui/lib/utils";

const OPACITY_PRESETS: InspectorPresetOption[] = [
  { value: "0", label: "0" },
  { value: "25", label: "25" },
  { value: "50", label: "50" },
  { value: "75", label: "75" },
  { value: "100", label: "100" },
];

type AppearanceSectionProps = {
  parsed: ParsedClassName;
  onUpdate: (patch: Partial<ParsedClassName>) => void;
};

export function AppearanceSection({
  parsed,
  onUpdate,
}: AppearanceSectionProps) {
  const hasPerCorner = hasPerCornerRadius(parsed);
  const [perCornerMode, setPerCornerMode] = useState(hasPerCorner);

  const unifiedRadius = getUnifiedRadiusValue(parsed);

  const setUnifiedRadius = (value: string) => {
    onUpdate({
      borderRadius: formatRadiusPx("rounded", value),
      borderRadiusTopLeft: undefined,
      borderRadiusTopRight: undefined,
      borderRadiusBottomLeft: undefined,
      borderRadiusBottomRight: undefined,
    });
  };

  const setCornerRadius = (
    corner: "tl" | "tr" | "bl" | "br",
    value: string,
  ) => {
    const formatted = formatRadiusPx(`rounded-${corner}`, value);
    const patch: Partial<ParsedClassName> = { borderRadius: undefined };
    if (corner === "tl") patch.borderRadiusTopLeft = formatted;
    if (corner === "tr") patch.borderRadiusTopRight = formatted;
    if (corner === "bl") patch.borderRadiusBottomLeft = formatted;
    if (corner === "br") patch.borderRadiusBottomRight = formatted;
    onUpdate(patch);
  };

  const togglePerCorner = () => {
    const next = !perCornerMode;
    setPerCornerMode(next);
    if (next) {
      const value = unifiedRadius || "0";
      onUpdate({
        borderRadius: undefined,
        borderRadiusTopLeft: formatRadiusPx("rounded-tl", value),
        borderRadiusTopRight: formatRadiusPx("rounded-tr", value),
        borderRadiusBottomLeft: formatRadiusPx("rounded-bl", value),
        borderRadiusBottomRight: formatRadiusPx("rounded-br", value),
      });
      return;
    }

    onUpdate({
      borderRadius: formatRadiusPx("rounded", unifiedRadius || "0"),
      borderRadiusTopLeft: undefined,
      borderRadiusTopRight: undefined,
      borderRadiusBottomLeft: undefined,
      borderRadiusBottomRight: undefined,
    });
  };

  return (
    <InspectorSection title="Appearance">
      <div className="space-y-3">
        <InspectorField label="Opacity">
          <InspectorNumberInput
            aria-label="Opacity"
            value={parseOpacityPercent(parsed.opacity)}
            unit="%"
            placeholder="100"
            presets={OPACITY_PRESETS}
            onChange={(input) =>
              onUpdate({ opacity: formatOpacityPercent(input) })
            }
          />
        </InspectorField>

        <div className="space-y-1.5">
          <span className="block text-xs text-muted-foreground">
            All corners
          </span>
          <div className="flex items-center gap-1.5">
            <InspectorNumberInput
              aria-label="All corners radius"
              value={perCornerMode ? "" : unifiedRadius}
              unit="px"
              placeholder={perCornerMode ? "Mixed" : "0"}
              showPresets={false}
              scrollAdjust
              onChange={setUnifiedRadius}
            />
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label={
                perCornerMode
                  ? "Use unified corner radius"
                  : "Edit individual corners"
              }
              aria-pressed={perCornerMode}
              className={cn(perCornerMode && "bg-muted")}
              onClick={togglePerCorner}
            >
              <SquaresFourIcon className="size-3.5" />
            </Button>
          </div>
        </div>

        {perCornerMode ? (
          <InspectorGrid>
            <InspectorField label="Top Left">
              <InspectorNumberInput
                aria-label="Top left radius"
                value={parseRadiusPx(parsed.borderRadiusTopLeft)}
                unit="px"
                placeholder="0"
                showPresets={false}
                scrollAdjust
                onChange={(value) => setCornerRadius("tl", value)}
              />
            </InspectorField>
            <InspectorField label="Top Right">
              <InspectorNumberInput
                aria-label="Top right radius"
                value={parseRadiusPx(parsed.borderRadiusTopRight)}
                unit="px"
                placeholder="0"
                showPresets={false}
                scrollAdjust
                onChange={(value) => setCornerRadius("tr", value)}
              />
            </InspectorField>
            <InspectorField label="Bottom Left">
              <InspectorNumberInput
                aria-label="Bottom left radius"
                value={parseRadiusPx(parsed.borderRadiusBottomLeft)}
                unit="px"
                placeholder="0"
                showPresets={false}
                scrollAdjust
                onChange={(value) => setCornerRadius("bl", value)}
              />
            </InspectorField>
            <InspectorField label="Bottom Right">
              <InspectorNumberInput
                aria-label="Bottom right radius"
                value={parseRadiusPx(parsed.borderRadiusBottomRight)}
                unit="px"
                placeholder="0"
                showPresets={false}
                scrollAdjust
                onChange={(value) => setCornerRadius("br", value)}
              />
            </InspectorField>
          </InspectorGrid>
        ) : null}
      </div>
    </InspectorSection>
  );
}

function hasPerCornerRadius(parsed: ParsedClassName): boolean {
  return Boolean(
    parsed.borderRadiusTopLeft ||
      parsed.borderRadiusTopRight ||
      parsed.borderRadiusBottomLeft ||
      parsed.borderRadiusBottomRight,
  );
}

function getUnifiedRadiusValue(parsed: ParsedClassName): string {
  if (parsed.borderRadius) return parseRadiusPx(parsed.borderRadius);

  const corners = [
    parseRadiusPx(parsed.borderRadiusTopLeft),
    parseRadiusPx(parsed.borderRadiusTopRight),
    parseRadiusPx(parsed.borderRadiusBottomLeft),
    parseRadiusPx(parsed.borderRadiusBottomRight),
  ].filter((value, index, array) => array[index] !== undefined);

  if (corners.length > 0 && corners.every((value) => value === corners[0])) {
    return corners[0]!;
  }

  return "";
}
