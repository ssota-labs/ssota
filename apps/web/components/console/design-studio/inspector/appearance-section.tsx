"use client";

import { useEffect, useState } from "react";
import { SquaresFourIcon } from "@phosphor-icons/react";
import type { ParsedClassName } from "@/lib/design-studio/tailwind-classname";
import {
  formatOpacityPercent,
  formatRadiusClass,
  formatRadiusOnUnitChange,
  formatRadiusValueOnUnitChange,
  parseOpacityPercent,
  parseRadiusValue,
  resolveRadiusReferencePx,
  type RadiusUnit,
} from "@/lib/design-studio/tailwind-classname";
import {
  InspectorField,
  InspectorGrid,
  InspectorScrubberNumberInput,
  InspectorSection,
  type InspectorNumberUnit,
} from "@ssota/ui/components/design-studio";
import { Button } from "@ssota/ui/components/ui/button";
import { cn } from "@ssota/ui/lib/utils";

const RADIUS_UNITS = ["px", "%"] as const satisfies readonly InspectorNumberUnit[];

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
  const hasRadiusClass = Boolean(
    parsed.borderRadius || hasPerCornerRadius(parsed),
  );
  const [preferredRadiusUnit, setPreferredRadiusUnit] = useState<RadiusUnit>(
    () => getRadiusUnit(parsed),
  );

  useEffect(() => {
    if (hasRadiusClass) {
      setPreferredRadiusUnit(getRadiusUnit(parsed));
    }
  }, [
    hasRadiusClass,
    parsed.borderRadius,
    parsed.borderRadiusTopLeft,
    parsed.borderRadiusTopRight,
    parsed.borderRadiusBottomLeft,
    parsed.borderRadiusBottomRight,
  ]);

  const radiusUnit = hasRadiusClass
    ? getRadiusUnit(parsed)
    : preferredRadiusUnit;
  const unifiedRadius = getUnifiedRadiusValue(parsed);
  const radiusMax = radiusUnit === "%" ? 100 : undefined;
  const radiusReferencePx = resolveRadiusReferencePx(parsed);

  const convertRadiusForUnit = (
    value: string,
    currentUnit: RadiusUnit,
    nextUnit: RadiusUnit,
  ) =>
    clampRadiusValue(
      formatRadiusValueOnUnitChange(
        value,
        currentUnit,
        nextUnit,
        radiusReferencePx,
      ) || "0",
      nextUnit,
    );

  const setUnifiedRadius = (value: string) => {
    if (perCornerMode) {
      onUpdate({
        borderRadius: undefined,
        borderRadiusTopLeft: formatRadiusClass("rounded-tl", value, radiusUnit),
        borderRadiusTopRight: formatRadiusClass("rounded-tr", value, radiusUnit),
        borderRadiusBottomLeft: formatRadiusClass("rounded-bl", value, radiusUnit),
        borderRadiusBottomRight: formatRadiusClass("rounded-br", value, radiusUnit),
      });
      return;
    }

    onUpdate({
      borderRadius: formatRadiusClass("rounded", value, radiusUnit),
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
    const formatted = formatRadiusClass(`rounded-${corner}`, value, radiusUnit);
    const patch: Partial<ParsedClassName> = { borderRadius: undefined };
    if (corner === "tl") patch.borderRadiusTopLeft = formatted;
    if (corner === "tr") patch.borderRadiusTopRight = formatted;
    if (corner === "bl") patch.borderRadiusBottomLeft = formatted;
    if (corner === "br") patch.borderRadiusBottomRight = formatted;
    onUpdate(patch);
  };

  const setRadiusUnit = (nextUnit: RadiusUnit) => {
    setPreferredRadiusUnit(nextUnit);

    if (perCornerMode) {
      const convertCorner = (
        prefix: "rounded-tl" | "rounded-tr" | "rounded-bl" | "rounded-br",
        className?: string,
      ) => {
        const { value } = parseRadiusValue(className);
        if (!value.trim()) return className;
        return formatRadiusOnUnitChange(
          prefix,
          value,
          radiusUnit,
          nextUnit,
          radiusReferencePx,
        );
      };

      onUpdate({
        borderRadius: undefined,
        borderRadiusTopLeft: convertCorner(
          "rounded-tl",
          parsed.borderRadiusTopLeft,
        ),
        borderRadiusTopRight: convertCorner(
          "rounded-tr",
          parsed.borderRadiusTopRight,
        ),
        borderRadiusBottomLeft: convertCorner(
          "rounded-bl",
          parsed.borderRadiusBottomLeft,
        ),
        borderRadiusBottomRight: convertCorner(
          "rounded-br",
          parsed.borderRadiusBottomRight,
        ),
      });
      return;
    }

    const radiusValue = unifiedRadius.trim();
    if (!radiusValue && !hasRadiusClass) {
      return;
    }

    onUpdate({
      borderRadius: formatRadiusOnUnitChange(
        "rounded",
        radiusValue || "0",
        radiusUnit,
        nextUnit,
        radiusReferencePx,
      ),
      borderRadiusTopLeft: undefined,
      borderRadiusTopRight: undefined,
      borderRadiusBottomLeft: undefined,
      borderRadiusBottomRight: undefined,
    });
  };

  const handleRadiusUnitChange = (nextUnit: InspectorNumberUnit) => {
    if (nextUnit === "px" || nextUnit === "%") {
      setRadiusUnit(nextUnit);
    }
  };

  const radiusInputProps = {
    unit: radiusUnit,
    units: RADIUS_UNITS,
    onUnitChange: handleRadiusUnitChange,
    min: radiusUnit === "%" ? 0 : undefined,
    max: radiusMax,
  } as const;

  const togglePerCorner = () => {
    const next = !perCornerMode;
    setPerCornerMode(next);
    if (next) {
      const value = unifiedRadius || "0";
      onUpdate({
        borderRadius: undefined,
        borderRadiusTopLeft: formatRadiusClass("rounded-tl", value, radiusUnit),
        borderRadiusTopRight: formatRadiusClass("rounded-tr", value, radiusUnit),
        borderRadiusBottomLeft: formatRadiusClass("rounded-bl", value, radiusUnit),
        borderRadiusBottomRight: formatRadiusClass("rounded-br", value, radiusUnit),
      });
      return;
    }

    onUpdate({
      borderRadius: formatRadiusClass("rounded", unifiedRadius || "0", radiusUnit),
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
          <InspectorScrubberNumberInput
            aria-label="Opacity"
            value={parseOpacityPercent(parsed.opacity)}
            unit="%"
            min={0}
            max={100}
            placeholder="100"
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
            <InspectorScrubberNumberInput
              aria-label="All corners radius"
              value={unifiedRadius}
              placeholder={perCornerMode && !unifiedRadius ? "Mixed" : "0"}
              onChange={setUnifiedRadius}
              {...radiusInputProps}
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
              <InspectorScrubberNumberInput
                aria-label="Top left radius"
                value={parseRadiusValue(parsed.borderRadiusTopLeft).value}
                placeholder="0"
                onChange={(value) => setCornerRadius("tl", value)}
                {...radiusInputProps}
              />
            </InspectorField>
            <InspectorField label="Top Right">
              <InspectorScrubberNumberInput
                aria-label="Top right radius"
                value={parseRadiusValue(parsed.borderRadiusTopRight).value}
                placeholder="0"
                onChange={(value) => setCornerRadius("tr", value)}
                {...radiusInputProps}
              />
            </InspectorField>
            <InspectorField label="Bottom Left">
              <InspectorScrubberNumberInput
                aria-label="Bottom left radius"
                value={parseRadiusValue(parsed.borderRadiusBottomLeft).value}
                placeholder="0"
                onChange={(value) => setCornerRadius("bl", value)}
                {...radiusInputProps}
              />
            </InspectorField>
            <InspectorField label="Bottom Right">
              <InspectorScrubberNumberInput
                aria-label="Bottom right radius"
                value={parseRadiusValue(parsed.borderRadiusBottomRight).value}
                placeholder="0"
                onChange={(value) => setCornerRadius("br", value)}
                {...radiusInputProps}
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

function getRadiusUnit(parsed: ParsedClassName): RadiusUnit {
  if (parsed.borderRadius) {
    return parseRadiusValue(parsed.borderRadius).unit;
  }

  for (const corner of [
    parsed.borderRadiusTopLeft,
    parsed.borderRadiusTopRight,
    parsed.borderRadiusBottomLeft,
    parsed.borderRadiusBottomRight,
  ]) {
    if (corner) return parseRadiusValue(corner).unit;
  }

  return "px";
}

function getUnifiedRadiusValue(parsed: ParsedClassName): string {
  if (parsed.borderRadius) return parseRadiusValue(parsed.borderRadius).value;

  const corners = [
    parseRadiusValue(parsed.borderRadiusTopLeft).value,
    parseRadiusValue(parsed.borderRadiusTopRight).value,
    parseRadiusValue(parsed.borderRadiusBottomLeft).value,
    parseRadiusValue(parsed.borderRadiusBottomRight).value,
  ].filter((value, index, array) => array[index] !== undefined);

  if (corners.length > 0 && corners.every((value) => value === corners[0])) {
    return corners[0]!;
  }

  return "";
}

function clampRadiusValue(value: string, unit: RadiusUnit): string {
  if (unit !== "%") return value;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return value;
  return String(Math.min(100, Math.max(0, numeric)));
}
